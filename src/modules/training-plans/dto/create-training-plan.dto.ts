import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTrainingPlanDto {
  @ApiProperty({ example: 'Plano basico' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Plano para iniciantes' })
  @IsOptional()
  @IsString()
  description?: string;
}
