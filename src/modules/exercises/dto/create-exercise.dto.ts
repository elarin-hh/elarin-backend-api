import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateExerciseDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
