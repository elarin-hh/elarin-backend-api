import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignExerciseDto {
  @ApiProperty({
    example: 1,
    description: 'Exercise template ID to assign to user',
  })
  @IsNumber()
  @IsNotEmpty()
  template_id: number;
}
