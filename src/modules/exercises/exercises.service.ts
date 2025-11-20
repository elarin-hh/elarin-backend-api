import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import * as path from 'path';
import * as fs from 'fs';

interface DefaultExercise {
  type: string;
  name: string;
  is_active: boolean;
}

interface DefaultExercisesConfig {
  exercises: DefaultExercise[];
}

@Injectable()
export class ExercisesService {
  private defaultExercises: DefaultExercise[] = [];

  constructor(private readonly supabaseService: SupabaseService) {
    this.loadDefaultExercises();
  }

  /**
   * Carrega exercícios padrão do arquivo JSON
   */
  private loadDefaultExercises() {
    try {
      // Use process.cwd() to get project root - works in both dev and prod
      const configPath = path.join(process.cwd(), 'src/config/default-exercises.json');
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const config: DefaultExercisesConfig = JSON.parse(fileContent);
      this.defaultExercises = config.exercises;
    } catch (error) {
      // Fallback para exercícios hardcoded se o arquivo não existir
      this.defaultExercises = [
        { type: 'squat', name: 'Agachamento', is_active: true },
        { type: 'pushup', name: 'Flexão', is_active: true },
        { type: 'pullup', name: 'Barra Fixa', is_active: true },
        { type: 'plank', name: 'Prancha', is_active: true },
      ];
    }
  }

  /**
   * Get all exercises (active and inactive) for a specific user
   */
  async getUserExercises(userId: string) {
    const userIdInt = await this.getUserIdFromUuid(userId);

    const { data, error } = await this.supabaseService.client
      .from('exercises')
      .select('*')
      .eq('user_id', userIdInt)
      // Active exercises first, then newest
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch exercises');
    }

    return data || [];
  }

  /**
   * Seed default exercises for a new user
   * Called automatically when user registers
   */
  async seedDefaultExercises(userId: string) {
    const userIdInt = await this.getUserIdFromUuid(userId);

    // Verificar se já existem exercícios
    const { data: existing } = await this.supabaseService.client
      .from('exercises')
      .select('id')
      .eq('user_id', userIdInt)
      .limit(1);

    if (existing && existing.length > 0) {
      // Usuário já tem exercícios, não precisa criar
      return;
    }

    // Criar exercícios padrão (lidos do arquivo JSON)
    const exercisesToInsert = this.defaultExercises.map(ex => ({
      user_id: userIdInt,
      type: ex.type,
      name: ex.name,
      is_active: ex.is_active,
    }));

    const { error } = await this.supabaseService.client
      .from('exercises')
      .insert(exercisesToInsert);

    if (error) {
      throw new InternalServerErrorException('Failed to seed default exercises');
    }
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
