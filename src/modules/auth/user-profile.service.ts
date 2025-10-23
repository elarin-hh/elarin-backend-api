import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';

interface UserProfile {
  id: number;
  uuid: string;
  full_name?: string;
  is_dev?: boolean;
}

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Busca dados customizados do usuário da tabela public.users
   * Retorna null se não encontrar (usuário pode não ter perfil ainda)
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('users')
        .select('id, uuid, full_name, is_dev')
        .eq('uuid', userId)
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
}
