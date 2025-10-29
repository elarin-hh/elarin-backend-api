import { IsString, IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO de entrada para síntese TTS
 * Consome a saída JSON do serviço LLM
 */
export class SynthesizeDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  ssml: string | null;

  @IsString()
  language: string;

  @IsString()
  tone_used: string;

  @IsOptional()
  @IsString()
  micro_tip: string | null;

  @IsString()
  short_id: string;

  @IsBoolean()
  moderated: boolean;
}
