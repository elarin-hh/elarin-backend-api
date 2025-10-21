import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GymAuthController } from './gym-auth.controller';
import { GymController } from './gym.controller';
import { GymAuthService } from './gym-auth.service';
import { GymService } from './gym.service';
import { SupabaseModule } from '../../common/services/supabase.module';

@Module({
  imports: [
    SupabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'elarin-gym-secret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [GymAuthController, GymController],
  providers: [GymAuthService, GymService],
  exports: [GymAuthService],
})
export class GymAdminModule {}
