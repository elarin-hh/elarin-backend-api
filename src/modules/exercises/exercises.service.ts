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
   * Carrega exercicios padrao do arquivo JSON
   */
  private loadDefaultExercises() {
    try {
      const configPath = path.join(process.cwd(), 'src/config/default-exercises.json');
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const config: DefaultExercisesConfig = JSON.parse(fileContent);
      this.defaultExercises = config.exercises;
    } catch (error) {
      // Se o arquivo nao existir ou der erro de parse, mantem vazio
      this.defaultExercises = [];
    }
  }

  private get allowedExerciseTypes(): string[] {
    return this.defaultExercises.map((ex) => ex.type);
  }

  /**
   * Garante que o usuario tenha somente os exercicios permitidos.
   * Remove tipos fora da lista default e cria os que estiverem faltando.
   */
  private async ensureDefaultExercisesForUser(userIdInt: number) {
    const allowedTypes = this.allowedExerciseTypes;

    // Sem lista default -> apaga tudo para nao deixar exercicios obsoletos
    if (!allowedTypes.length) {
      await this.supabaseService.client.from('exercises').delete().eq('user_id', userIdInt);
      return;
    }

    const { data: existing, error: existingError } = await this.supabaseService.client
      .from('exercises')
      .select('id, type')
      .eq('user_id', userIdInt);

    if (existingError) {
      throw new InternalServerErrorException('Failed to sync exercises');
    }

    const allowedSet = new Set(allowedTypes);
    const existingAllowed = (existing || []).filter((ex) => allowedSet.has(ex.type));
    const idsToDelete = (existing || [])
      .filter((ex) => !allowedSet.has(ex.type))
      .map((ex) => ex.id);

    if (idsToDelete.length) {
      const { error: deleteError } = await this.supabaseService.client
        .from('exercises')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        throw new InternalServerErrorException('Failed to sync exercises');
      }
    }

    const existingTypes = new Set(existingAllowed.map((ex) => ex.type));
    const missingExercises = this.defaultExercises.filter((ex) => !existingTypes.has(ex.type));

    if (!missingExercises.length) {
      return;
    }

    const exercisesToInsert = missingExercises.map((ex) => ({
      user_id: userIdInt,
      type: ex.type,
      name: ex.name,
      is_active: ex.is_active
    }));

    const { error: insertError } = await this.supabaseService.client
      .from('exercises')
      .insert(exercisesToInsert);

    if (insertError) {
      throw new InternalServerErrorException('Failed to seed default exercises');
    }
  }

  /**
   * Get all exercises (active and inactive) for a specific user
   */
  async getUserExercises(userId: string) {
    const userIdInt = await this.getUserIdFromUuid(userId);

    await this.ensureDefaultExercisesForUser(userIdInt);

    if (!this.allowedExerciseTypes.length) {
      return [];
    }

    const { data, error } = await this.supabaseService.client
      .from('exercises')
      .select('*')
      .eq('user_id', userIdInt)
      .in('type', this.allowedExerciseTypes)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch exercises');
    }

    const defaultByType = new Map(this.defaultExercises.map((ex) => [ex.type, ex]));

    const normalized = (data || []).map((exercise) => {
      const defaults = defaultByType.get(exercise.type);
      if (!defaults) return exercise;

      return {
        ...exercise,
        name: defaults.name,
        is_active: defaults.is_active
      };
    });

    return normalized;
  }

  /**
   * Seed default exercises for a new user
   * Called automatically when user registers
   */
  async seedDefaultExercises(userId: string) {
    const userIdInt = await this.getUserIdFromUuid(userId);
    await this.ensureDefaultExercisesForUser(userIdInt);
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
