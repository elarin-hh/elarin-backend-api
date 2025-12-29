import { IsObject, IsNotEmpty } from 'class-validator';

export class UpdateTemplateConfigDto {
  @IsObject()
  @IsNotEmpty()
  config: Record<string, any>;
}

export class UpdateUserExerciseConfigDto {
  @IsObject()
  @IsNotEmpty()
  config: Record<string, any>;
}
