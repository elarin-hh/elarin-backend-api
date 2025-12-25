import { IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTemplateDefaultConfigDto {
  @ApiProperty({
    description: 'New default configuration (will replace existing default_config)',
    example: {
      heuristicConfig: {
        minConfidence: 0.7,
        kneeDownAngle: 120,
        kneeUpAngle: 160
      },
      metrics: [
        { id: 'duration', type: 'duration', target: 60 },
        { id: 'reps', type: 'reps', target: 5 }
      ]
    }
  })
  @IsObject()
  @IsNotEmpty()
  default_config: Record<string, any>;
}

export class UpdateUserExerciseConfigDto {
  @ApiProperty({
    description: 'User-specific configuration overrides (merged with template defaults)',
    example: {
      metrics: [
        { id: 'reps', target: 10 }
      ]
    }
  })
  @IsObject()
  @IsNotEmpty()
  config: Record<string, any>;
}
