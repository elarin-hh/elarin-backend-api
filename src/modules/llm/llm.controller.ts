import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { LlmService } from './llm.service';
import { FeedbackToSpeechDto, LLMFeedbackResponseDto } from './dto/feedback-to-speech.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  /**
   * POST /llm/feedback-to-speech
   * Converte feedback técnico em texto natural/SSML
   */
  @Public()
  @Post('feedback-to-speech')
  @HttpCode(HttpStatus.OK)
  async feedbackToSpeech(
    @Body() input: FeedbackToSpeechDto,
  ): Promise<LLMFeedbackResponseDto> {
    return this.llmService.generateFeedbackSpeech(input);
  }

  /**
   * GET /llm/test-welcome
   * Teste rápido: gera mensagem de boas-vindas
   */
  @Public()
  @Get('test-welcome')
  @HttpCode(HttpStatus.OK)
  async testWelcome(
    @Query('language') language?: string,
    @Query('exercicio') exercicio?: string,
  ): Promise<LLMFeedbackResponseDto> {
    return this.llmService.generateFeedbackSpeech({
      feedback_base: 'welcome_start',
      context: {
        exercicio: exercicio || 'treino',
        nivel: 'iniciante',
        language: language || 'pt-BR',
      },
      tone: 'encouraging',
      include_ssml: true,
    });
  }
}
