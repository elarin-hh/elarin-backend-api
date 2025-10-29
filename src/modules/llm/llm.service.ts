import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FeedbackToSpeechDto, LLMFeedbackResponseDto } from './dto/feedback-to-speech.dto';
import * as crypto from 'crypto';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly offensiveWords = ['terrible', 'give up', 'stupid', 'worthless', 'pathetic'];
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.geminiApiKey');
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      this.logger.warn('GEMINI_API_KEY not configured. Using fallback templates mode.');
    } else {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        this.logger.log('Gemini AI initialized successfully (gemini-2.5-flash)');
      } catch (error) {
        this.logger.error(`Failed to initialize Gemini: ${error.message}`);
      }
    }
  }

  /**
   * Processa feedback técnico e gera texto natural/SSML
   */
  async generateFeedbackSpeech(
    input: FeedbackToSpeechDto,
  ): Promise<LLMFeedbackResponseDto> {
    try {
      // Verificar moderação
      const moderated = this.containsOffensiveContent(input.feedback_base);

      // Gerar texto natural (via Gemini se disponível, senão templates)
      const text = this.model
        ? await this.generateNaturalTextWithGemini(input, moderated)
        : this.generateNaturalTextWithTemplates(
            input.feedback_base,
            input.context,
            input.tone,
            moderated,
          );

      // Gerar micro-dica para iniciantes
      const micro_tip =
        input.context.nivel === 'iniciante'
          ? this.generateMicroTip(input.feedback_base, input.context.exercicio)
          : null;

      // Gerar SSML se solicitado
      const ssml = input.include_ssml
        ? this.generateSSML(text, input.tone)
        : null;

      // Gerar short_id único
      const short_id = this.generateShortId(
        text,
        input.context.language,
        input.tone,
      );

      const response: LLMFeedbackResponseDto = {
        text,
        ssml,
        language: input.context.language,
        tone_used: input.tone,
        micro_tip,
        short_id,
        moderated,
      };

      this.logger.log(
        `Generated feedback speech: ${short_id} (moderated: ${moderated}, via: ${this.model ? 'Gemini' : 'Templates'})`,
      );

      return response;
    } catch (error) {
      this.logger.error(`Error generating feedback speech: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gera texto natural usando Gemini AI
   */
  private async generateNaturalTextWithGemini(
    input: FeedbackToSpeechDto,
    moderated: boolean,
  ): Promise<string> {
    if (moderated) {
      return this.generateModeratedText(input.context.language, input.tone);
    }

    const prompt = this.buildGeminiPrompt(input);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();

      // Remover possíveis marcações de código ou formatação extra
      text = text.replace(/```.*?```/gs, '').replace(/\*\*/g, '').trim();

      // Garantir que o texto seja conciso (1-2 frases)
      const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
      if (sentences.length > 2) {
        text = sentences.slice(0, 2).join('. ') + '.';
      }

      return text;
    } catch (error) {
      this.logger.error(`Gemini API error: ${error.message}. Falling back to templates.`);
      return this.generateNaturalTextWithTemplates(
        input.feedback_base,
        input.context,
        input.tone,
        moderated,
      );
    }
  }

  /**
   * Constrói prompt para Gemini
   */
  private buildGeminiPrompt(input: FeedbackToSpeechDto): string {
    const { feedback_base, context, tone } = input;

    const toneInstructions: Record<string, string> = {
      encouraging: 'encorajador e positivo',
      motivational: 'motivacional e energético',
      neutral: 'neutro e objetivo',
      professional: 'profissional e técnico',
    };

    const languageNames: Record<string, string> = {
      'pt-BR': 'português brasileiro',
      'en-US': 'inglês americano',
    };

    return `Você é um personal trainer virtual estilo Geração Z. Gere um feedback de voz natural e conciso para um praticante de exercícios.

Contexto:
- Exercício: ${context.exercicio}
- Nível: ${context.nivel}
- Feedback técnico: ${feedback_base}
- Tom desejado: ${toneInstructions[tone] || 'neutro'}
- Idioma: ${languageNames[context.language] || context.language}

Instruções:
1. Escreva APENAS 1-2 frases curtas e diretas
2. Use linguagem GERAÇÃO Z: casual, descontraída, sem formalidade excessiva
3. Use gírias leves e modernas quando apropriado (tipo: "tá top", "bora", "massa", "mandou bem")
4. Seja ${toneInstructions[tone] || 'neutro'} mas sempre com vibe jovem e amigável
5. NÃO use emojis, asteriscos ou formatação
6. NÃO repita informações técnicas verbatim
7. Foque em motivar de forma leve e autêntica, sem soar falso

Responda APENAS com o texto do feedback, sem explicações adicionais.`;
  }

  /**
   * Verifica se o conteúdo contém palavras ofensivas
   */
  private containsOffensiveContent(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.offensiveWords.some((word) => lowerText.includes(word));
  }

  /**
   * Gera texto natural baseado no feedback técnico (usando templates)
   */
  private generateNaturalTextWithTemplates(
    feedbackBase: string,
    context: { exercicio: string; nivel: string; language: string },
    tone: string,
    moderated: boolean,
  ): string {
    if (moderated) {
      return this.generateModeratedText(context.language, tone);
    }

    const templates = this.getTextTemplates(context.language, tone);
    const template = this.selectTemplate(feedbackBase, templates);

    return this.interpolateTemplate(template, context.exercicio, feedbackBase);
  }

  /**
   * Gera texto moderado quando conteúdo ofensivo é detectado
   */
  private generateModeratedText(language: string, tone: string): string {
    const moderatedTemplates: Record<string, Record<string, string>> = {
      'pt-BR': {
        encouraging: 'Continue praticando! Cada repetição te deixa mais forte.',
        motivational: 'Você está no caminho certo! Mantenha o foco.',
        neutral: 'Continue o treino. A prática leva à perfeição.',
        professional: 'Prossiga com o exercício. O progresso é gradual.',
      },
      'en-US': {
        encouraging: 'Keep practicing! Each rep makes you stronger.',
        motivational: "You're on the right track! Stay focused.",
        neutral: 'Continue the workout. Practice makes perfect.',
        professional: 'Proceed with the exercise. Progress is gradual.',
      },
    };

    return moderatedTemplates[language]?.[tone] || moderatedTemplates['en-US']?.[tone] || 'Continue practicing.';
  }

  /**
   * Retorna templates de texto por idioma e tom
   */
  private getTextTemplates(
    language: string,
    tone: string,
  ): Record<string, string[]> {
    const templates: Record<string, Record<string, string[]>> = {
      'pt-BR': {
        encouraging: [
          'Mandou bem demais! Tá top essa postura no {exercicio}.',
          'Boooa! Continue assim que tá perfeito esse {exercicio}.',
          'Tá arrasando! Esse {exercicio} tá impecável, segue o flow.',
        ],
        motivational: [
          'Bora lá, você consegue! Mantém essa vibe no {exercicio}.',
          'Tá voando! Esse {exercicio} tá cada vez mais brabo.',
          'Isso aí, continua! Tá dando tudo de bom nesse {exercicio}.',
        ],
        neutral: [
          'Forma certinha no {exercicio}, bora continuar.',
          'Tá executando direitinho o {exercicio}, segue assim.',
          '{exercicio} feito corretamente, próximo.',
        ],
        professional: [
          'Técnica no ponto no {exercicio}, mantém a consistência.',
          'Execução biomecânica certinha do {exercicio}.',
          'Forma técnica adequada no {exercicio}, vamo que vamo.',
        ],
      },
      'en-US': {
        encouraging: [
          'Nice! Your {exercicio} form is on point.',
          'Killing it! Keep that vibe on the {exercicio}.',
          'Looking good! Your {exercicio} is fire.',
        ],
        motivational: [
          'Let\'s go! Keep that energy on the {exercicio}.',
          'You\'re crushing it! That {exercicio} is getting better.',
          'That\'s it! Keep vibing with that {exercicio}.',
        ],
        neutral: [
          'Good form on the {exercicio}, keep going.',
          'Solid {exercicio} execution, maintain it.',
          '{exercicio} done right, next.',
        ],
        professional: [
          'Technique is clean on the {exercicio}, stay consistent.',
          'Biomechanics on point for {exercicio}.',
          'Technical form is solid on {exercicio}, let\'s go.',
        ],
      },
    };

    return templates[language] || templates['en-US'];
  }

  /**
   * Seleciona template aleatório baseado no feedback
   */
  private selectTemplate(
    feedbackBase: string,
    templates: Record<string, string[]>,
  ): string {
    const isPositive = feedbackBase.includes('correct') || feedbackBase.includes('good');
    const toneTemplates = Object.values(templates)[0];
    const randomIndex = Math.floor(Math.random() * toneTemplates.length);
    return toneTemplates[randomIndex];
  }

  /**
   * Interpola template com valores dinâmicos
   */
  private interpolateTemplate(
    template: string,
    exercicio: string,
    feedbackBase: string,
  ): string {
    let text = template.replace(/{exercicio}/g, exercicio);

    // Mensagens especiais
    if (feedbackBase === 'welcome_start') {
      return 'Pronto, bora pro treino!';
    }

    // Adicionar detalhes específicos do feedback se necessário
    if (feedbackBase.includes('depth_insufficient')) {
      const match = feedbackBase.match(/depth_insufficient_(\d+)cm/);
      if (match) {
        text = text.replace('.', ` Desça mais ${match[1]} centímetros.`);
      }
    }

    return text;
  }

  /**
   * Gera micro-dica para iniciantes
   */
  private generateMicroTip(feedbackBase: string, exercicio: string): string {
    const tips: Record<string, string[]> = {
      squat: [
        'Mantenha os joelhos alinhados',
        'Peito para cima sempre',
        'Peso nos calcanhares',
        'Desça até 90 graus',
      ],
      deadlift: [
        'Costas sempre retas',
        'Quadril para trás',
        'Barra próxima ao corpo',
        'Olhar para frente',
      ],
      plank: [
        'Corpo em linha reta',
        'Abdômen contraído',
        'Não deixe o quadril cair',
        'Respire naturalmente',
      ],
      lunge: [
        'Joelho não ultrapassa pé',
        'Tronco ereto sempre',
        'Desça controladamente',
        'Alterne as pernas',
      ],
    };

    const exerciseTips = tips[exercicio] || tips['squat'];
    return exerciseTips[Math.floor(Math.random() * exerciseTips.length)];
  }

  /**
   * Gera SSML válido com prosódia baseada no tom
   */
  private generateSSML(text: string, tone: string): string {
    const prosodyMap: Record<string, { rate: string; pitch: string }> = {
      encouraging: { rate: 'medium', pitch: '+5%' },
      motivational: { rate: 'medium', pitch: '+3%' },
      neutral: { rate: 'medium', pitch: '0%' },
      professional: { rate: 'slow', pitch: '-2%' },
    };

    const prosody = prosodyMap[tone] || prosodyMap['neutral'];

    return `<speak><prosody rate="${prosody.rate}" pitch="${prosody.pitch}">${text}</prosody></speak>`;
  }

  /**
   * Gera short_id único baseado no conteúdo
   */
  private generateShortId(text: string, language: string, tone: string): string {
    const content = `${text}${language}${tone}`;
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return hash.substring(0, 8);
  }
}
