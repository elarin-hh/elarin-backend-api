import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SynthesizeDto } from './dto/synthesize.dto';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private apiKey: string | null = null;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.elevenlabsApiKey');
    if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
      this.logger.warn('ELEVENLABS_API_KEY not configured. TTS will return empty buffers.');
    } else {
      this.apiKey = apiKey;
      this.logger.log('ElevenLabs TTS API key configured successfully');
    }
  }

  /**
   * Sintetiza áudio a partir da saída do LLM
   * @param input - Saída JSON do serviço LLM
   * @returns Buffer de áudio ou URL do áudio gerado
   */
  async synthesize(input: SynthesizeDto): Promise<{
    audio_url?: string;
    audio_buffer?: Buffer;
    content_type: string;
    duration_ms?: number;
    cached: boolean;
    short_id: string;
  }> {
    try {
      this.logger.log(
        `Synthesizing audio for short_id: ${input.short_id} (language: ${input.language}, tone: ${input.tone_used})`,
      );

      // Priorizar texto plano
      const textToSynthesize = input.text;

      // Sintetizar com ElevenLabs se disponível
      const audioBuffer = this.apiKey
        ? await this.synthesizeWithElevenLabs(textToSynthesize, input.language, input.tone_used)
        : Buffer.from([]);

      // Calcular duração aproximada (baseado em taxa de fala)
      const duration_ms = this.estimateDuration(textToSynthesize);

      return {
        audio_buffer: audioBuffer,
        content_type: 'audio/mpeg',
        duration_ms,
        cached: false,
        short_id: input.short_id,
      };
    } catch (error) {
      this.logger.error(`Error synthesizing audio: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sintetiza áudio com ElevenLabs usando API REST direta
   */
  private async synthesizeWithElevenLabs(
    text: string,
    language: string,
    tone: string,
  ): Promise<Buffer> {
    if (!this.apiKey) {
      this.logger.warn('ElevenLabs API key not configured');
      return Buffer.from([]);
    }

    try {
      // Selecionar voz baseada no idioma
      const voiceId = this.selectVoiceId(language, tone);

      this.logger.debug(
        `ElevenLabs synthesis: "${text.substring(0, 50)}..." (voice: ${voiceId}, lang: ${language})`,
      );

      // Fazer requisição HTTP direta para ElevenLabs API
      const url = `${this.baseUrl}/text-to-speech/${voiceId}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: this.getToneStyleValue(tone),
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
      }

      // Converter resposta para buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      this.logger.log(`ElevenLabs audio generated successfully: ${buffer.length} bytes`);

      return buffer;
    } catch (error) {
      this.logger.error(`ElevenLabs API error: ${error.message}`);
      return Buffer.from([]);
    }
  }

  /**
   * Seleciona voice ID baseado no idioma e tom
   */
  private selectVoiceId(language: string, tone: string): string {
    // Vozes ElevenLabs pré-definidas (IDs reais)
    const voices: Record<string, Record<string, string>> = {
      'pt-BR': {
        encouraging: 'SVPHYQTYggH6QYa57jNs', // Adam (energético)
        motivational: 'SVPHYQTYggH6QYa57jNs', // Adam
        neutral: 'SVPHYQTYggH6QYa57jNs', // Adam
        professional: 'SVPHYQTYggH6QYa57jNs', // Adam
      },
      'en-US': {
        encouraging: 'SVPHYQTYggH6QYa57jNs', // Adam
        motivational: 'SVPHYQTYggH6QYa57jNs', // Adam
        neutral: 'SVPHYQTYggH6QYa57jNs', // Adam
        professional: 'SVPHYQTYggH6QYa57jNs', // Adam
      },
    };

    return voices[language]?.[tone] || 'SVPHYQTYggH6QYa57jNs';
  }

  /**
   * Mapeia tom para valor de estilo (0-1)
   */
  private getToneStyleValue(tone: string): number {
    const styleMap: Record<string, number> = {
      encouraging: 0.7,
      motivational: 0.9,
      neutral: 0.5,
      professional: 0.3,
    };

    return styleMap[tone] || 0.5;
  }

  /**
   * Estima duração do áudio baseado no texto
   * Assume taxa média de fala: 150 palavras/minuto
   */
  private estimateDuration(text: string): number {
    const words = text.split(/\s+/).length;
    const wordsPerMinute = 150;
    const minutes = words / wordsPerMinute;
    return Math.round(minutes * 60 * 1000); // converter para ms
  }

  /**
   * Integração com cache (opcional)
   * Verifica se áudio já foi gerado para o mesmo short_id
   */
  async getCachedAudio(shortId: string): Promise<Buffer | null> {
    // Implementar cache com Redis ou sistema de arquivos
    // Exemplo: return redis.get(`tts:${shortId}`)
    return null;
  }

  /**
   * Armazena áudio em cache
   */
  async cacheAudio(shortId: string, audioBuffer: Buffer): Promise<void> {
    // Implementar persistência em cache
    // Exemplo: redis.setex(`tts:${shortId}`, 3600, audioBuffer)
    this.logger.debug(`Caching audio for short_id: ${shortId}`);
  }
}
