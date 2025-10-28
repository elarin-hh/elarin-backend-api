import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { UpdateConsentDto, ConsentType } from '../users/dto/consent.dto';

interface UserProfile {
  id: number;
  auth_uid?: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  height_cm?: number;
  weight_kg?: number;
  birth_date?: string;
  locale?: string;
  is_dev?: boolean;
  consent_given_at?: string;
  biometric_consent_given_at?: string;
  marketing_consent?: boolean;
  age_verified?: boolean;
}

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Busca dados do usuário da tabela public.users
   * Suporta tanto B2C (usuário standalone) quanto B2B (usuário vinculado a organização)
   * Retorna null se não encontrar
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error} = await this.supabaseService.client
        .from('users')
        .select('id, auth_uid, email, full_name, avatar_url, height_cm, weight_kg, birth_date, locale, is_dev, consent_given_at, biometric_consent_given_at, marketing_consent, age_verified')
        .eq('auth_uid', userId)
        .single();

      if (error) {
        // Se o erro for "not found", retorna null ao invés de lançar erro
        if (error.code === 'PGRST116') {
          this.logger.warn(`User profile not found for user ${userId}`);
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error(`Error fetching user profile for ${userId}:`, error);
      return null; // Retorna null em caso de erro para não quebrar o login
    }
  }

  /**
   * Cria perfil do usuário na tabela public.users
   */
  async createUserProfile(
    userId: string,
    email: string,
    fullName?: string,
  ): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('users')
        .insert({
          auth_uid: userId,
          email: email,
          full_name: fullName || null,
          locale: 'pt-BR',
          is_dev: false,
        })
        .select('id, auth_uid, email, full_name, avatar_url, height_cm, weight_kg, birth_date, locale, is_dev')
        .single();

      if (error) {
        this.logger.error(`Error creating user profile for ${userId}:`, error);
        return null;
      }

      this.logger.log(`User profile created successfully for ${userId}`);
      return data;
    } catch (error) {
      this.logger.error(`Error creating user profile for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Busca ou cria perfil do usuário
   */
  async getOrCreateUserProfile(
    userId: string,
    email: string,
    fullName?: string,
  ): Promise<UserProfile | null> {
    // Primeiro tenta buscar
    let profile = await this.getUserProfile(userId);

    // Se não encontrar, cria
    if (!profile) {
      profile = await this.createUserProfile(userId, email, fullName);
    }

    return profile;
  }

  /**
   * Atualizar consentimento do usuário (LGPD Art. 8º - Revogação)
   * Tipos: general (Termos + Privacidade), biometric (Dados Biométricos), marketing
   */
  async updateConsent(authUserId: string, dto: UpdateConsentDto) {
    try {
      const userProfile = await this.getUserProfile(authUserId);

      if (!userProfile) {
        throw new BadRequestException('User profile not found');
      }

      const timestamp = dto.consent_timestamp || new Date().toISOString();
      const updateData: Record<string, unknown> = {};

      switch (dto.consent_type) {
        case ConsentType.GENERAL:
          updateData.consent_given_at = dto.consent_given ? timestamp : null;
          break;
        case ConsentType.BIOMETRIC:
          updateData.biometric_consent_given_at = dto.consent_given ? timestamp : null;
          break;
        case ConsentType.MARKETING:
          updateData.marketing_consent = dto.consent_given;
          break;
      }

      const { data, error } = await this.supabaseService.client
        .from('users')
        .update(updateData)
        .eq('id', userProfile.id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(error.message);
      }

      this.logger.log(`Consent updated for user ${authUserId}: ${dto.consent_type} = ${dto.consent_given}`);
      return data;
    } catch (error) {
      this.logger.error(`Error updating consent for user ${authUserId}:`, error);
      throw error;
    }
  }

  /**
   * Exportar todos os dados do usuário (LGPD Art. 18, V - Portabilidade)
   * Retorna JSON com todos os dados pessoais e de treino
   */
  async exportUserData(authUserId: string) {
    try {
      const userProfile = await this.getUserProfile(authUserId);

      if (!userProfile) {
        throw new BadRequestException('User profile not found');
      }

      const userProfileId = userProfile.id;

      // Buscar exercícios do usuário
      const { data: exercises } = await this.supabaseService.client
        .from('exercises')
        .select('*')
        .eq('user_id', userProfileId);

      // Buscar métricas de treino
      const { data: metrics } = await this.supabaseService.client
        .from('metrics')
        .select('*')
        .eq('user_id', userProfileId);

      // Buscar membros de organizações
      const { data: memberships } = await this.supabaseService.client
        .from('memberships')
        .select('*, organizations(*)')
        .eq('user_id', userProfileId);

      // Montar JSON de exportação conforme LGPD Art. 18
      const exportData = {
        export_info: {
          exported_at: new Date().toISOString(),
          user_id: userProfileId,
          regulation: 'LGPD (Lei 13.709/2018) Art. 18, V',
          format: 'JSON',
        },
        personal_data: {
          id: userProfile.id,
          auth_uid: userProfile.auth_uid,
          email: userProfile.email,
          full_name: userProfile.full_name,
          birth_date: userProfile.birth_date,
          height_cm: userProfile.height_cm,
          weight_kg: userProfile.weight_kg,
          locale: userProfile.locale,
          avatar_url: userProfile.avatar_url,
        },
        consent_data: {
          consent_given_at: userProfile.consent_given_at,
          biometric_consent_given_at: userProfile.biometric_consent_given_at,
          marketing_consent: userProfile.marketing_consent,
          age_verified: userProfile.age_verified,
        },
        exercises: exercises || [],
        training_metrics: metrics || [],
        organization_memberships: memberships || [],
      };

      this.logger.log(`Data exported for user ${authUserId}`);
      return exportData;
    } catch (error) {
      this.logger.error(`Error exporting data for user ${authUserId}:`, error);
      throw error;
    }
  }
}
