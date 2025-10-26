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

    if (!authData.user) {
      throw new BadRequestException('Auth user not created');
    }

    // Cria ou busca o perfil do usuário na tabela public.users
    const userProfile = await this.userProfileService.getOrCreateUserProfile(
      authData.user.id,
      email,
      full_name,
    );

    if (!userProfile) {
      throw new BadRequestException('Failed to create user profile');
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

  async registerWithOrganization(registerDto: { email: string; password: string; full_name: string; organization_id: number }) {
    const { email, password, full_name, organization_id } = registerDto;

    let authUserId: string | null = null;
    let userProfileId: number | null = null;

    try {
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

      // Step 3: Create user profile
      const userProfile = await this.userProfileService.getOrCreateUserProfile(
        authUserId,
        email,
        full_name,
      );

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

    const userProfile = await this.userProfileService.getUserProfile(user.id);

    return {
      ...user,
      full_name: userProfile?.full_name || user.user_metadata?.full_name,
      is_dev: userProfile?.is_dev || false,
    };
  }
}
