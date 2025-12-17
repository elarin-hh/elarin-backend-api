import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SupabaseModule } from '../../common/services/supabase.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [SupabaseModule, OrganizationsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
