import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTrainingPlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
