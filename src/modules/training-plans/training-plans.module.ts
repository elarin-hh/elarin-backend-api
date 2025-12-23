import { Module } from '@nestjs/common';
import { TrainingPlansController } from './training-plans.controller';
import { TrainingPlansService } from './training-plans.service';
import { OrganizationTrainingPlansController } from './organization-training-plans.controller';
import { OrganizationTrainingPlansService } from './organization-training-plans.service';
import { SupabaseModule } from '../../common/services/supabase.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [SupabaseModule, OrganizationsModule],
  controllers: [TrainingPlansController, OrganizationTrainingPlansController],
  providers: [TrainingPlansService, OrganizationTrainingPlansService],
  exports: [TrainingPlansService, OrganizationTrainingPlansService],
})
export class TrainingPlansModule {}
