import { IsString, IsNumber, IsInt, Min, Max, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteSessionDto {
  @ApiProperty({ example: 1, description: 'Session ID' })
  @IsInt()
  @IsPositive()
  session_id: number;

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
}
