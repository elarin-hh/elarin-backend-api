import { IsInt, IsOptional, IsPositive, Min } from 'class-validator';

export class AddTrainingPlanItemDto {
  @IsInt()
  @IsPositive()
  template_id: number;

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
