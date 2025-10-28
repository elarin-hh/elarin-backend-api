import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { SupabaseModule } from '../../common/services/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
