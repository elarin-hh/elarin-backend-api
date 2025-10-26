import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';

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
        .select('id, auth_uid, email, full_name, avatar_url, height_cm, weight_kg, birth_date, locale, is_dev')
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
}
