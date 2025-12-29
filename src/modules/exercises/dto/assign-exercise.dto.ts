import { IsNumber, IsNotEmpty } from 'class-validator';

export class AssignExerciseDto {
  @IsNumber()
  @IsNotEmpty()
  template_id: number;
}
