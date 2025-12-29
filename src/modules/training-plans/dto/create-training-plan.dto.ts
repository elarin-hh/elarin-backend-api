import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTrainingPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
