import { IsInt, IsPositive } from 'class-validator';

export class AssignTrainingPlanDto {
  @IsInt()
  @IsPositive()
  plan_id: number;
}
