import { Module, Global } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserProfileService } from './user-profile.service';
import { ExercisesModule } from '../exercises/exercises.module';

@Global()
@Module({
  imports: [ExercisesModule],
  controllers: [AuthController],
  providers: [AuthService, UserProfileService],
  exports: [AuthService, UserProfileService],
})
export class AuthModule {}
