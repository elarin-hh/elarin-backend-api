import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrganizationAuthController } from './organization-auth.controller';
import { OrganizationController } from './organization.controller';
import { OrganizationAuthService } from './organization-auth.service';
import { OrganizationService } from './organization.service';
import { SupabaseModule } from '../../common/services/supabase.module';

@Module({
  imports: [
    SupabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'elarin-organization-secret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [OrganizationAuthController, OrganizationController],
  providers: [OrganizationAuthService, OrganizationService],
  exports: [OrganizationAuthService],
})
export class OrganizationsModule {}
