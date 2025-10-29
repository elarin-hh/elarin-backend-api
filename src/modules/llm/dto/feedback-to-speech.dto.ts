import { IsString, IsBoolean, IsObject, IsOptional, IsIn } from 'class-validator';

export class FeedbackContextDto {
  @IsString()
  exercicio: string;

  @IsString()
  nivel: string;

  @IsString()
  language: string;
}

export class FeedbackToSpeechDto {
  @IsString()
  feedback_base: string;

  @IsObject()
  context: FeedbackContextDto;

  @IsString()
  @IsIn(['encouraging', 'neutral', 'motivational', 'professional'])
  tone: string;

  @IsBoolean()
  include_ssml: boolean;
}

export class LLMFeedbackResponseDto {
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
