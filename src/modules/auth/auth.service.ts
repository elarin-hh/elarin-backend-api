import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { RegisterDto, LoginDto } from './dto';
import { UserProfileService } from './user-profile.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly userProfileService: UserProfileService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, full_name } = registerDto;

    const { data: authData, error } = await this.supabaseService.client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const userProfile = authData.user
      ? await this.userProfileService.getUserProfile(authData.user.id)
      : null;

    return {
      user: {
        ...authData.user,
        full_name: userProfile?.full_name || full_name,
        is_dev: userProfile?.is_dev || false,
      },
      session: authData.session,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const { data: authData, error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !authData.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Buscar dados customizados do perfil do usuário
    const userProfile = await this.userProfileService.getUserProfile(authData.user.id);

    return {
      user: {
        ...authData.user,
        full_name: userProfile?.full_name || authData.user.user_metadata?.full_name,
        is_dev: userProfile?.is_dev || false,
      },
      session: authData.session,
    };
  }

  async logout(token: string) {
    const { error } = await this.supabaseService.client.auth.admin.signOut(token);

    if (error) {
      throw new BadRequestException('Logout failed');
    }

    return { message: 'Logout successful' };
  }

  async verifyToken(token: string) {
    const { data: { user }, error } = await this.supabaseService.client.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    // Buscar dados customizados do perfil do usuário
    const userProfile = await this.userProfileService.getUserProfile(user.id);

    return {
      ...user,
      full_name: userProfile?.full_name || user.user_metadata?.full_name,
      is_dev: userProfile?.is_dev || false,
    };
  }
}
