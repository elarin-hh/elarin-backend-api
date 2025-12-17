import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';

export interface UpdateExerciseConfigDto {
  config: Record<string, any>;
}

@Injectable()
export class ExercisesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Get all exercises (active and inactive) for a specific user
   */
  async getUserExercises(userId: string) {
    const userIdInt = await this.getUserIdFromUuid(userId);

    const { data, error } = await this.supabaseService.client
      .from('exercises')
      .select('*')
      .eq('user_id', userIdInt)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch exercises');
    }

    return data || [];
  }

  /**
   * Atualiza a configuracao personalizada de um exercicio
   */
  async updateExerciseConfig(
    exerciseId: string,
    userId: string,
    newConfig: Record<string, any>
  ) {
    const userIdInt = await this.getUserIdFromUuid(userId);

    // Primeiro busca a config atual para fazer merge (opcional, mas bom para seguranca)
    const { data: currentExercise, error: fetchError } =
      await this.supabaseService.client
        .from('exercises')
        .select('config')
        .eq('id', exerciseId)
        .eq('user_id', userIdInt)
        .single();

    if (fetchError || !currentExercise) {
      throw new NotFoundException('Exercise not found');
    }

    const updatedConfig = {
      ...(currentExercise.config || {}),
      ...newConfig
    };

    const { data, error } = await this.supabaseService.client
      .from('exercises')
      .update({ config: updatedConfig })
      .eq('id', exerciseId)
      .eq('user_id', userIdInt)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException('Failed to update exercise config');
    }

    return data;
  }

  /**
   * Helper: Obter user_id (integer) a partir do UUID do Supabase Auth
   */
  private async getUserIdFromUuid(userUuid: string): Promise<number> {
    const { data, error } = await this.supabaseService.client
      .from('users')
      .select('id')
      .eq('auth_uid', userUuid)
      .single();

    if (error || !data) {
      throw new NotFoundException('User not found');
    }

    return data.id;
  }
}
