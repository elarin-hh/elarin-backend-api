import { IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating the default_config of an exercise template
 * Only default_config can be modified, fixed_config is immutable
 */
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

/**
 * DTO for updating user-specific exercise configuration overrides
 */
export class UpdateUserExerciseConfigDto {
  @ApiProperty({
    description: 'User-specific configuration overrides (merged with template defaults)',
    example: {
      metrics: [
        { id: 'reps', target: 10 }  // Override only reps target
      ]
    }
  })
  @IsObject()
  @IsNotEmpty()
  config: Record<string, any>;
}
