import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { RegisterDto, LoginDto } from './dto';
import { UserProfileService } from './user-profile.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly userProfileService: UserProfileService,
  ) { }

  async register(registerDto: RegisterDto) {
    const { email, password, full_name, birth_date, marketing_consent, height_cm, weight_kg } = registerDto;



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

    if (!authData.user) {
      throw new BadRequestException('Auth user not created');
    }


    const { data: userProfile, error: userError } = await this.supabaseService.client
      .from('app_users')
      .insert({
        auth_uid: authData.user.id,
        email,
        full_name,
        birth_date,
        age_verified: true,
        consent_given_at: new Date().toISOString(),
        marketing_consent: marketing_consent || false,
        height_cm,
        weight_kg,
      })
      .select()
      .single();

    if (userError) {

      await this.supabaseService.client.auth.admin.deleteUser(authData.user.id);
      throw new BadRequestException(userError.message);
    }



    return {
      user: {
        ...authData.user,
        id: userProfile.id.toString(),
        full_name: userProfile.full_name || full_name,
        is_dev: userProfile.is_dev || false,
      },
      session: authData.session,
    };
  }

  async registerWithOrganization(registerDto: { email: string; password: string; full_name: string; birth_date: string; organization_id: number; marketing_consent?: boolean; height_cm: number; weight_kg: number }) {
    const { email, password, full_name, birth_date, organization_id, marketing_consent, height_cm, weight_kg } = registerDto;

    let authUserId: string | null = null;
    let userProfileId: number | null = null;

    try {



      const { data: org, error: orgError } = await this.supabaseService.client
        .from('app_organizations')
        .select('id, name, is_active')
        .eq('id', organization_id)
        .single();

      if (orgError || !org) {
        throw new BadRequestException('Organization not found');
      }

      if (!org.is_active) {
        throw new BadRequestException('Organization is not active');
      }


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

      if (!authData.user) {
        throw new BadRequestException('Auth user not created');
      }

      authUserId = authData.user.id;


      const { data: userProfile, error: userError } = await this.supabaseService.client
        .from('app_users')
        .insert({
          auth_uid: authUserId,
          email,
          full_name,
          birth_date,
          age_verified: true,
          consent_given_at: new Date().toISOString(),
          marketing_consent: marketing_consent || false,
          height_cm,
          weight_kg,
        })
        .select()
        .single();

      if (userError) {
        throw new BadRequestException(userError.message);
      }

      if (!userProfile) {
        throw new BadRequestException('Failed to create user profile');
      }

      userProfileId = userProfile.id;


      const { data: membership, error: membershipError } = await this.supabaseService.client
        .from('app_memberships')
        .insert({
          user_id: userProfileId,
          organization_id: organization_id,
          role: 'member',
          status: 'PENDING',
          is_active: false,
        })
        .select()
        .single();

      if (membershipError) {
        throw new Error(`Failed to link user to organization: ${membershipError.message || 'Unknown error'}`);
      }




      if (!userProfileId) {
        throw new BadRequestException('User profile ID is missing');
      }

      return {
        user: {
          ...authData.user,
          id: userProfileId.toString(),
          full_name: userProfile.full_name || full_name,
          is_dev: userProfile.is_dev || false,
        },
        session: authData.session,
      };

    } catch (error) {

      if (userProfileId) {
        try {
          await this.supabaseService.client
            .from('app_users')
            .delete()
            .eq('id', userProfileId);
        } catch (deleteError) {

        }
      }

      if (authUserId) {
        try {
          await this.supabaseService.client.auth.admin.deleteUser(authUserId);
        } catch (deleteError) {

        }
      }

      throw new BadRequestException(error.message || 'Registration failed');
    }
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

    await this.ensureNotOrganizationAccount(authData.user, 'Invalid credentials');

    const userProfile = await this.userProfileService.getOrCreateUserProfile(
      authData.user.id,
      authData.user.email || '',
      authData.user.user_metadata?.full_name
    );

    return {
      user: {
        ...authData.user,
        id: userProfile?.id?.toString() || authData.user?.id,
        full_name: userProfile?.full_name || authData.user.user_metadata?.full_name,
        is_dev: userProfile?.is_dev || false,
      },
      session: authData.session,
    };
  }

  async verifyToken(token: string) {
    const { data: { user }, error } = await this.supabaseService.client.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    await this.ensureNotOrganizationAccount(user, 'Invalid token');

    const userProfile = await this.userProfileService.getOrCreateUserProfile(
      user.id,
      user.email || '',
      user.user_metadata?.full_name
    );

    return {
      ...user,
      full_name: userProfile?.full_name || user.user_metadata?.full_name,
      is_dev: userProfile?.is_dev || false,
    };
  }

  private async ensureNotOrganizationAccount(
    user: { id: string; user_metadata?: { type?: string | null } },
    errorMessage: string
  ) {
    if (user?.user_metadata?.type === 'organization') {
      throw new UnauthorizedException(errorMessage);
    }

    const { data: organization, error } = await this.supabaseService.client
      .from('app_organizations')
      .select('id')
      .eq('auth_uid', user.id)
      .maybeSingle();

    if (error) {
      throw new UnauthorizedException(errorMessage);
    }

    if (organization) {
      throw new UnauthorizedException(errorMessage);
    }
  }

  async deleteAccount(authUserId: string) {
    try {

      const userProfile = await this.userProfileService.getUserProfile(authUserId);

      if (!userProfile) {
        throw new BadRequestException('User profile not found');
      }

      const userProfileId = userProfile.id;


      await this.supabaseService.client
        .from('app_training_sessions')
        .delete()
        .eq('user_id', userProfileId);


      await this.supabaseService.client
        .from('app_training_plan_sessions')
        .delete()
        .eq('user_id', userProfileId);


      await this.supabaseService.client
        .from('app_training_plan_assignments')
        .delete()
        .eq('user_id', userProfileId);


      await this.supabaseService.client
        .from('app_user_exercises')
        .delete()
        .eq('user_id', userProfileId);


      await this.supabaseService.client
        .from('app_memberships')
        .delete()
        .eq('user_id', userProfileId);


      await this.supabaseService.client
        .from('app_users')
        .delete()
        .eq('id', userProfileId);


      const { error: authDeleteError } = await this.supabaseService.client.auth.admin.deleteUser(authUserId);

      if (authDeleteError) {
        throw new BadRequestException(`Failed to delete auth user: ${authDeleteError.message}`);
      }

      return { message: 'Account deleted successfully' };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to delete account');
    }
  }
}
