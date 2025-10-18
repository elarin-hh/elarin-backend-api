import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

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

    return {
      user: authData.user,
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

    return {
      user: authData.user,
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

    return user;
  }
}
