import { IsString, IsNumber, IsInt, Min, Max, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para salvar resultado completo de treino
 * Substitui CreateSessionDto e CompleteSessionDto
 */
export class SaveTrainingDto {
  @ApiProperty({ example: 'squat', description: 'Exercise type identifier' })
  @IsString()
  exercise_type: string;

  @ApiProperty({ example: 15, description: 'Repetitions completed' })
  @IsInt()
  @Min(0)
  reps_completed: number;

  @ApiProperty({ example: 3, description: 'Sets completed' })
  @IsInt()
  @Min(1)
  sets_completed: number;

  @ApiProperty({ example: 300, description: 'Duration in seconds' })
  @IsInt()
  @Min(0)
  duration_seconds: number;

  @ApiPropertyOptional({ example: 0.95, description: 'Average confidence score (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  avg_confidence?: number;

  @ApiPropertyOptional({ example: 123, description: 'Training plan session ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  plan_session_id?: number;

  @ApiPropertyOptional({ example: 456, description: 'Training plan item ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  plan_item_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Sequence index inside the plan session' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sequence_index?: number;
}
