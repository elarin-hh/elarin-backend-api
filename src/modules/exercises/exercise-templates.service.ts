import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { ExerciseTemplate } from './interfaces/exercise-template.interface';

@Injectable()
export class ExerciseTemplatesService {
  constructor(private readonly supabaseService: SupabaseService) { }

  /**
   * Get all active templates for admins to assign
   */
  async getActiveTemplates(): Promise<ExerciseTemplate[]> {
    const { data, error } = await this.supabaseService.client
      .from('app_exercise_templates')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch exercise templates');
    }

    return data || [];
  }

  /**
   * Get all templates (active and inactive) for admin management
   */
  async getAllTemplates(): Promise<ExerciseTemplate[]> {
    const { data, error } = await this.supabaseService.client
      .from('app_exercise_templates')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch exercise templates');
    }

    return data || [];
  }

  /**
   * Get template by ID (for validation)
   */
  async getTemplateById(templateId: number): Promise<ExerciseTemplate | null> {
    const { data, error } = await this.supabaseService.client
      .from('app_exercise_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }
}
