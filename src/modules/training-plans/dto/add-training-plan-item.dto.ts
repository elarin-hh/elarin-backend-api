import { IsInt, IsOptional, IsPositive, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddTrainingPlanItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  template_id: number;

  @ApiPropertyOptional({ example: 1, description: 'Optional position in plan' })
  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  target_reps?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  target_duration_sec?: number;
}
