import { Module } from '@nestjs/common';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
import { StaticConfigService } from './static-config.service';
import { ExerciseWhitelistService } from './exercise-whitelist.service';
import { ExerciseTemplatesService } from './exercise-templates.service';
import { OrganizationExerciseAdminService } from './organization-exercise-admin.service';
import { OrganizationExerciseAdminController } from './organization-exercise-admin.controller';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  controllers: [
    ExercisesController,
    OrganizationExerciseAdminController,
  ],
  providers: [
    ExercisesService,
    StaticConfigService,
    ExerciseWhitelistService,
    ExerciseTemplatesService,
    OrganizationExerciseAdminService,
  ],
  exports: [ExercisesService],
})
export class ExercisesModule { }
