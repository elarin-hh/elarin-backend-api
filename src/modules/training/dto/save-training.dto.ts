import { IsString, IsNumber, IsInt, Min, Max, IsOptional, IsPositive } from 'class-validator';

export class SaveTrainingDto {
  @IsString()
  exercise_type: string;

  @IsInt()
  @Min(0)
  reps_completed: number;

  @IsInt()
  @Min(1)
  sets_completed: number;

  @IsInt()
  @Min(0)
  duration_seconds: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  avg_confidence?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  plan_session_id?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  plan_item_id?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sequence_index?: number;
}
