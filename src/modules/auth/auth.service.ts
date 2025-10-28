import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { RegisterDto, LoginDto } from './dto';
import { UserProfileService } from './user-profile.service';
import { ExercisesService } from '../exercises/exercises.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly userProfileService: UserProfileService,
    private readonly exercisesService: ExercisesService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, full_name, birth_date, locale, marketing_consent } = registerDto;

    // VALIDAR IDADE MÍNIMA (13 anos - LGPD Art. 14, §1º + ECA Lei 8.069/1990)
    const birthDateObj = new Date(birth_date);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();

    const actualAge = (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate()))
      ? age - 1
      : age;

    if (actualAge < 13) {
      throw new BadRequestException(
        'Você deve ter pelo menos 13 anos para criar uma conta. ' +
        'Conforme Lei nº 13.709/2018 (LGPD) Art. 14, §1º e Lei nº 8.069/1990 (ECA).'
      );
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

    // Criar perfil com consentimento e verificação de idade
    const { data: userProfile, error: userError } = await this.supabaseService.client
      .from('users')
      .insert({
        auth_uid: authData.user.id,
        email,
        full_name,
        birth_date,
        age_verified: true,
        consent_given_at: new Date().toISOString(), // Consentimento geral (Termos + Privacidade)
        marketing_consent: marketing_consent || false,
        locale: locale || 'pt-BR',
      })
      .select()
      .single();

    if (userError) {
      // Rollback: deletar usuário do Auth
      await this.supabaseService.client.auth.admin.deleteUser(authData.user.id);
      throw new BadRequestException(userError.message);
    }

    // Criar exercícios padrão para o novo usuário
    try {
      await this.exercisesService.seedDefaultExercises(authData.user.id);
    } catch (error) {
      // Silently fail - exercises can be created later
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

  async registerWithOrganization(registerDto: { email: string; password: string; full_name: string; birth_date: string; organization_id: number; locale?: string; marketing_consent?: boolean }) {
    const { email, password, full_name, birth_date, organization_id, locale, marketing_consent } = registerDto;

    let authUserId: string | null = null;
    let userProfileId: number | null = null;

    try {
      // VALIDAR IDADE MÍNIMA (13 anos - LGPD Art. 14, §1º + ECA Lei 8.069/1990)
      const birthDateObj = new Date(birth_date);
      const today = new Date();
      const age = today.getFullYear() - birthDateObj.getFullYear();
      const monthDiff = today.getMonth() - birthDateObj.getMonth();

      const actualAge = (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate()))
        ? age - 1
        : age;

      if (actualAge < 13) {
        throw new BadRequestException(
          'Você deve ter pelo menos 13 anos para criar uma conta. ' +
          'Conforme Lei nº 13.709/2018 (LGPD) Art. 14, §1º e Lei nº 8.069/1990 (ECA).'
        );
      }

      // Step 1: Verify organization exists first
      const { data: org, error: orgError } = await this.supabaseService.client
        .from('organizations')
        .select('id, name, is_active')
        .eq('id', organization_id)
        .single();

      if (orgError || !org) {
        throw new BadRequestException('Organization not found');
      }

      if (!org.is_active) {
        throw new BadRequestException('Organization is not active');
      }

      // Step 2: Register user
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

      // Step 3: Create user profile with LGPD compliance fields
      const { data: userProfile, error: userError } = await this.supabaseService.client
        .from('users')
        .insert({
          auth_uid: authUserId,
          email,
          full_name,
          birth_date,
          age_verified: true,
          consent_given_at: new Date().toISOString(),
          marketing_consent: marketing_consent || false,
          locale: locale || 'pt-BR',
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

      // Step 4: Link user to organization (CRITICAL - if this fails, rollback everything)
      const { data: membership, error: membershipError } = await this.supabaseService.client
        .from('memberships')
        .insert({
          user_id: userProfileId,
          organization_id: organization_id,
          role: 'member',
          is_active: true,
        })
        .select()
        .single();

      if (membershipError) {
        throw new Error(`Failed to link user to organization: ${membershipError.message || 'Unknown error'}`);
      }

      // Step 5: Seed default exercises (optional - don't rollback if this fails)
      try {
        await this.exercisesService.seedDefaultExercises(authUserId);
      } catch (error) {
        // Silently fail - exercises can be created later
      }

      // Success! Return user data
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
      // ROLLBACK: Delete created records if something failed
      if (userProfileId) {
        try {
          await this.supabaseService.client
            .from('users')
            .delete()
            .eq('id', userProfileId);
        } catch (deleteError) {
          // Silently fail rollback
        }
      }

      if (authUserId) {
        try {
          await this.supabaseService.client.auth.admin.deleteUser(authUserId);
        } catch (deleteError) {
          // Silently fail rollback
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

    const userProfile = await this.userProfileService.getUserProfile(authData.user.id);

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

    const userProfile = await this.userProfileService.getUserProfile(user.id);

    return {
      ...user,
      full_name: userProfile?.full_name || user.user_metadata?.full_name,
      is_dev: userProfile?.is_dev || false,
    };
  }

  async deleteAccount(authUserId: string) {
    try {
      // Get user profile to get the numeric ID
      const userProfile = await this.userProfileService.getUserProfile(authUserId);

      if (!userProfile) {
        throw new BadRequestException('User profile not found');
      }

      const userProfileId = userProfile.id;

      // Step 1: Delete all user-related data
      // Delete training metrics
      await this.supabaseService.client
        .from('metrics')
        .delete()
        .eq('user_id', userProfileId);

      // Delete exercises
      await this.supabaseService.client
        .from('exercises')
        .delete()
        .eq('user_id', userProfileId);

      // Delete memberships
      await this.supabaseService.client
        .from('memberships')
        .delete()
        .eq('user_id', userProfileId);

      // Step 2: Delete user profile
      await this.supabaseService.client
        .from('users')
        .delete()
        .eq('id', userProfileId);

      // Step 3: Delete auth user
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
