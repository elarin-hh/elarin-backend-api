import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateTrainingPlanItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  target_reps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  target_duration_sec?: number;
}
