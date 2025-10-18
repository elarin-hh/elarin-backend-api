import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import envConfig from './config/env.config';

// Modules
import { SupabaseModule } from './common/services/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { TrainingModule } from './modules/training/training.module';

// Guards and Filters
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100,
    }]),

    // Global modules
    SupabaseModule,

    // Feature modules
    AuthModule,
    ExercisesModule,
    TrainingModule,
  ],
  providers: [
    // Global guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global filters
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
