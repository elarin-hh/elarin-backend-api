import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { RegisterOrganizationDto, LoginOrganizationDto } from './dto';

@Injectable()
export class OrganizationAuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) { }

  async register(registerOrganizationDto: RegisterOrganizationDto) {
    const { email, password, ...organizationData } = registerOrganizationDto;

    const { data: existing } = await this.supabaseService.client
      .from('app_organizations')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const { data: authData, error: authError } = await this.supabaseService.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          type: 'organization',
          name: organizationData.name
        },
      },
    });

    if (authError || !authData.user) {
      throw new BadRequestException(authError?.message || 'Failed to create auth user');
    }

    let code = organizationData.code;
    if (!code) {
      code = this.generateOrganizationCode(organizationData.name);

      let codeExists = true;
      let attempts = 0;
      while (codeExists && attempts < 10) {
        const { data: existingCode } = await this.supabaseService.client
          .from('app_organizations')
          .select('id')
          .eq('code', code)
          .single();

        if (!existingCode) {
          codeExists = false;
        } else {
          code = `${this.generateOrganizationCode(organizationData.name)}-${Math.floor(Math.random() * 1000)}`;
          attempts++;
        }
      }
    }

    const { data: organization, error } = await this.supabaseService.client
      .from('app_organizations')
      .insert({
        ...organizationData,
        code,
        email,
        auth_uid: authData.user.id,
      })
      .select()
      .single();

    if (error) {
      await this.supabaseService.client.auth.admin.deleteUser(authData.user.id);
      throw new BadRequestException(error.message);
    }

    return {
      organization: this.sanitizeOrganization(organization),
      session: authData.session,
    };
  }

  async login(loginOrganizationDto: LoginOrganizationDto) {
    const { email, password } = loginOrganizationDto;

    const { data: authData, error: authError } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { data: organization, error } = await this.supabaseService.client
      .from('app_organizations')
      .select('*')
      .eq('auth_uid', authData.user.id)
      .eq('is_active', true)
      .single();

    if (error || !organization) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      organization: this.sanitizeOrganization(organization),
      session: authData.session,
    };
  }

  async logout() {
    return { message: 'Logout successful' };
  }

  async verifyToken(token: string) {
    const { data: { user }, error } = await this.supabaseService.client.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    const { data: organization } = await this.supabaseService.client
      .from('app_organizations')
      .select('*')
      .eq('auth_uid', user.id)
      .eq('is_active', true)
      .single();

    if (!organization) {
      throw new UnauthorizedException('Invalid token');
    }

    return this.sanitizeOrganization(organization);
  }

  async getProfile(authUid: string) {
    const { data: organization, error } = await this.supabaseService.client
      .from('app_organizations')
      .select('*')
      .eq('auth_uid', authUid)
      .single();

    if (error || !organization) {
      throw new UnauthorizedException('Invalid token');
    }

    return this.sanitizeOrganization(organization);
  }

  private sanitizeOrganization(organization: any) {
    const { auth_uid, ...sanitized } = organization;
    return sanitized;
  }

  private generateOrganizationCode(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .join('_');
  }
}
