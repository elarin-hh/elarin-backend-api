import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTrainingPlanDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  plan_id: number;
}
