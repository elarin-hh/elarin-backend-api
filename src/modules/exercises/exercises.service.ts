import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';

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
