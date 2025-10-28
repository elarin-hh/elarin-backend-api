import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { RegisterOrganizationDto, LoginOrganizationDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrganizationAuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerOrganizationDto: RegisterOrganizationDto) {
    const { email, password, ...organizationData } = registerOrganizationDto;

    const { data: existing } = await this.supabaseService.client
      .from('organizations')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Generate code automatically if not provided
    let code = organizationData.code;
    if (!code) {
      code = this.generateOrganizationCode(organizationData.name);

      // Ensure code is unique
      let codeExists = true;
      let attempts = 0;
      while (codeExists && attempts < 10) {
        const { data: existingCode } = await this.supabaseService.client
          .from('organizations')
          .select('id')
          .eq('code', code)
          .single();

        if (!existingCode) {
          codeExists = false;
        } else {
          // Append random number to make it unique
          code = `${this.generateOrganizationCode(organizationData.name)}-${Math.floor(Math.random() * 1000)}`;
          attempts++;
        }
      }
    }

    const { data: organization, error } = await this.supabaseService.client
      .from('organizations')
      .insert({
        ...organizationData,
        code,
        email,
        password_hash,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    const access_token = this.generateToken(organization.id, organization.email);

    return {
      organization: this.sanitizeOrganization(organization),
      access_token,
    };
  }

  async login(loginOrganizationDto: LoginOrganizationDto) {
    const { email, password } = loginOrganizationDto;

    const { data: organization, error } = await this.supabaseService.client
      .from('organizations')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !organization) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, organization.password_hash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const access_token = this.generateToken(organization.id, organization.email);

    return {
      organization: this.sanitizeOrganization(organization),
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
        secret: this.configService.get('JWT_SECRET') || 'elarin-organization-secret',
      });

      const { data: organization } = await this.supabaseService.client
        .from('organizations')
        .select('*')
        .eq('id', payload.sub)
        .eq('is_active', true)
        .single();

      if (!organization) {
        throw new UnauthorizedException('Invalid token');
      }

      return this.sanitizeOrganization(organization);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getProfile(organizationId: number) {
    const { data: organization, error } = await this.supabaseService.client
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error || !organization) {
      throw new UnauthorizedException('Organization not found');
    }

    return this.sanitizeOrganization(organization);
  }

  private generateToken(organizationId: number, email: string): string {
    return this.jwtService.sign(
      { sub: organizationId, email, type: 'organization' },
      {
        secret: this.configService.get('JWT_SECRET') || 'elarin-organization-secret',
        expiresIn: '7d',
      },
    );
  }

  private sanitizeOrganization(organization: any) {
    const { password_hash, ...sanitized } = organization;
    return sanitized;
  }

  /**
   * Generate a unique organization code from name
   * Example: "Empresa XYZ Ltda" -> "empresa_xyz_ltda"
   */
  private generateOrganizationCode(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .trim()
      .split(/\s+/)
      .join('_');
  }
}
