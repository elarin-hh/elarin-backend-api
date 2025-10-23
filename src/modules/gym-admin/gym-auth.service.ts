import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { RegisterGymDto, LoginGymDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GymAuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerGymDto: RegisterGymDto) {
    const { email, password, ...gymData } = registerGymDto;

    const { data: existing } = await this.supabaseService.client
      .from('gyms_company')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: gym, error } = await this.supabaseService.client
      .from('gyms_company')
      .insert({
        ...gymData,
        email,
        password_hash,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    const access_token = this.generateToken(gym.id, gym.email);

    return {
      gym: this.sanitizeGym(gym),
      access_token,
    };
  }

  async login(loginGymDto: LoginGymDto) {
    const { email, password } = loginGymDto;

    const { data: gym, error } = await this.supabaseService.client
      .from('gyms_company')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !gym) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, gym.password_hash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const access_token = this.generateToken(gym.id, gym.email);

    return {
      gym: this.sanitizeGym(gym),
      access_token,
    };
  }

  async logout() {
    // Para JWT, logout é feito no frontend removendo o token
    return { message: 'Logout successful' };
  }

  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET') || 'elarin-gym-secret',
      });

      const { data: gym } = await this.supabaseService.client
        .from('gyms_company')
        .select('*')
        .eq('id', payload.sub)
        .eq('is_active', true)
        .single();

      if (!gym) {
        throw new UnauthorizedException('Invalid token');
      }

      return this.sanitizeGym(gym);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getProfile(gymId: number) {
    const { data: gym, error } = await this.supabaseService.client
      .from('gyms_company')
      .select('*')
      .eq('id', gymId)
      .single();

    if (error || !gym) {
      throw new UnauthorizedException('Gym not found');
    }

    return this.sanitizeGym(gym);
  }

  private generateToken(gymId: number, email: string): string {
    return this.jwtService.sign(
      { sub: gymId, email, type: 'gym' },
      {
        secret: this.configService.get('JWT_SECRET') || 'elarin-gym-secret',
        expiresIn: '7d',
      },
    );
  }

  private sanitizeGym(gym: any) {
    const { password_hash, ...sanitized } = gym;
    return sanitized;
  }
}
