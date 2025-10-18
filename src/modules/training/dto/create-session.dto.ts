import { IsString, IsNumber, IsInt, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: 'push_up', description: 'Exercise type identifier' })
  @IsString()
  exercise_type: string;

  @ApiPropertyOptional({ example: 10, description: 'Target repetitions' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  target_reps?: number;

  @ApiPropertyOptional({ example: 3, description: 'Target sets' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  target_sets?: number;
}
