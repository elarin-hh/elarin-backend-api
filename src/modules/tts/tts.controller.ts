import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Header,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { TtsService } from './tts.service';
import { SynthesizeDto } from './dto/synthesize.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('tts')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  /**
   * POST /tts/synthesize
   * Sintetiza áudio a partir da saída JSON do serviço LLM
   */
  @Public()
  @Post('synthesize')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/json')
  async synthesize(@Body() input: SynthesizeDto, @Res() res: FastifyReply) {
    // Verificar cache primeiro
    const cached = await this.ttsService.getCachedAudio(input.short_id);
    if (cached) {
      res.type('audio/mpeg');
      return res.send(cached);
    }

    // Sintetizar novo áudio
    const result = await this.ttsService.synthesize(input);

    // Armazenar em cache para futuras requisições
    if (result.audio_buffer) {
      await this.ttsService.cacheAudio(input.short_id, result.audio_buffer);
    }

    // Retornar JSON com metadados (ou o buffer direto)
    return res.send({
      short_id: result.short_id,
      content_type: result.content_type,
      duration_ms: result.duration_ms,
      cached: result.cached,
      // Em produção, você poderia retornar:
      // - audio_url: URL pública do áudio (S3, CloudFront, etc.)
      // - audio_base64: Buffer codificado em base64
      message:
        'TTS synthesis successful (mock). Integrate with real TTS provider.',
    });
  }

  /**
   * POST /tts/synthesize/stream
   * Versão alternativa que retorna o áudio diretamente como stream
   */
  @Public()
  @Post('synthesize/stream')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'audio/mpeg')
  async synthesizeStream(@Body() input: SynthesizeDto, @Res() res: FastifyReply) {
    const result = await this.ttsService.synthesize(input);

    if (result.audio_buffer) {
      res.type('audio/mpeg');
      res.header('X-Audio-Duration-Ms', String(result.duration_ms));
      res.header('X-Short-Id', result.short_id);
      return res.send(result.audio_buffer);
    }

    return res.status(500).send({ error: 'Failed to generate audio' });
  }
}
