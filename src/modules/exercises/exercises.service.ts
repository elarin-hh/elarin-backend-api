import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';

@Injectable()
export class ExercisesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getAll() {
    const { data, error } = await this.supabaseService.client
      .from('exercises')
      .select('*')
      .order('difficulty', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch exercises');
    }

    return data;
  }

  async getByType(type: string) {
    const { data, error } = await this.supabaseService.client
      .from('exercises')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new NotFoundException('Exercise not found');
    }

    return data;
  }
}
