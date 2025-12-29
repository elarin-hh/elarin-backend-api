import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateExerciseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
