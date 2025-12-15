import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import * as path from 'path';
import * as fs from 'fs';

interface DefaultExercise {
  type: string;
  name: string;
  is_active: boolean;
  config?: Record<string, any>;
  image_url?: string;
}

interface DefaultExercisesConfig {
  exercises: DefaultExercise[];
}

export interface UpdateExerciseConfigDto {
  config: Record<string, any>;
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
    const candidatePaths = [
      path.join(process.cwd(), 'src/config/default-exercises.json'),
      // Fallback para execucao em dist/
      path.join(__dirname, '../../config/default-exercises.json'),
    ];

    for (const configPath of candidatePaths) {
      try {
        const fileContent = fs.readFileSync(configPath, 'utf-8');
        const config: DefaultExercisesConfig = JSON.parse(fileContent);
        this.defaultExercises = config.exercises;
        return;
      } catch {
        continue;
      }
    }

    // Se nenhum caminho funcionou, mantem vazio
    this.defaultExercises = [];
  }

  private get allowedExerciseTypes(): string[] {
    return this.defaultExercises.map((ex) => ex.type);
  }

  /**
   * Garante que o usuario tenha somente os exercicios permitidos.
   * Remove tipos fora da lista default, cria os que estiverem faltando e preenche image_url/config faltantes.
   */
  private async ensureDefaultExercisesForUser(userIdInt: number) {
    // Recarrega o arquivo a cada chamada para refletir alteracoes em runtime
    this.loadDefaultExercises();

    const allowedTypes = this.allowedExerciseTypes;

    // Sem lista default -> apaga tudo para nao deixar exercicios obsoletos
    if (!allowedTypes.length) {
      const { error: deleteAllError } = await this.supabaseService.client
        .from('exercises')
        .delete()
        .eq('user_id', userIdInt);

      if (deleteAllError) {
        throw new InternalServerErrorException('Failed to sync exercises');
      }
      return;
    }

    const { data: existing, error: existingError } = await this.supabaseService.client
      .from('exercises')
      .select('id, type, image_url, config')
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

    // Preenche image_url/config em registros existentes que estejam sem valor, usando o default
    if (existingAllowed.length) {
      const defaultsByType = new Map(
        this.defaultExercises.map((ex) => [ex.type, { image_url: ex.image_url, config: ex.config }])
      );

      for (const ex of existingAllowed) {
        const defaults = defaultsByType.get(ex.type);
        if (!defaults) continue;

        const updatePayload: Record<string, any> = {};
        if (defaults.image_url && !ex.image_url) {
          updatePayload.image_url = defaults.image_url;
        }
        if (defaults.config && (!ex.config || Object.keys(ex.config || {}).length === 0)) {
          updatePayload.config = defaults.config;
        }

        if (Object.keys(updatePayload).length) {
          const { error: updateError } = await this.supabaseService.client
            .from('exercises')
            .update(updatePayload)
            .eq('id', ex.id);

          if (updateError) {
            throw new InternalServerErrorException('Failed to sync exercises');
          }
        }
      }
    }

    if (!missingExercises.length) {
      return;
    }

    const exercisesToInsert = missingExercises.map((ex) => ({
      user_id: userIdInt,
      type: ex.type,
      name: ex.name,
      is_active: ex.is_active,
      image_url: ex.image_url ?? null,
      config: ex.config ?? null
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
        // Mantem o is_active do banco se existir, senao usa o default
        is_active: exercise.is_active ?? defaults.is_active,
        image_url: exercise.image_url ?? defaults.image_url ?? null,
        // Config final = Merge(Default Config, User Stored Config)
        config: {
          ...(defaults.config || {}),
          ...(exercise.config || {})
        }
      };
    });

    return normalized;
  }

  /**
   * Seed/sync exercises for a given user UUID (used at signup)
   */
  async seedDefaultExercises(userUuid: string) {
    const userIdInt = await this.getUserIdFromUuid(userUuid);
    await this.ensureDefaultExercisesForUser(userIdInt);
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
