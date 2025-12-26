import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import {
  type ExerciseMetric,
  validateOverride
} from './schemas/config-schema';


export interface UpdateExerciseConfigDto {
  config: Record<string, any>;
}

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name);

  constructor(
    private readonly supabaseService: SupabaseService
  ) { }

  async getUserExercises(userId: string) {
    const userIdInt = await this.getUserIdFromUuid(userId);

    const { data, error } = await this.supabaseService.client
      .from('app_user_exercises')
      .select(`
        id,
        template_id,
        is_active,
        created_at,
        updated_at,
        config,
        app_exercise_templates!inner (
          type,
          name,
          description,
          image_url
        )
      `)
      .eq('user_id', userIdInt)
      .eq('app_exercise_templates.is_active', true)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Falha ao buscar exercícios');
    }

    return (data || []).map((exercise: any) => ({
      id: exercise.id,
      template_id: exercise.template_id,
      type: exercise.app_exercise_templates.type,
      name: exercise.app_exercise_templates.name,
      description: exercise.app_exercise_templates.description,
      image_url: exercise.app_exercise_templates.image_url,
      is_active: exercise.is_active,
      created_at: exercise.created_at,
      updated_at: exercise.updated_at,
      config: exercise.config
    }));
  }

  async updateExerciseConfig(
    exerciseId: string,
    userId: string,
    newConfig: Record<string, any>
  ) {
    const userIdInt = await this.getUserIdFromUuid(userId);

    const { data: currentExercise, error: fetchError } =
      await this.supabaseService.client
        .from('app_user_exercises')
        .select('config')
        .eq('id', exerciseId)
        .eq('user_id', userIdInt)
        .single();

    if (fetchError || !currentExercise) {
      throw new NotFoundException('Exercício não encontrado');
    }

    if (!validateOverride(newConfig)) {
      throw new InternalServerErrorException(
        'Configuração inválida: apenas campos variáveis (heuristicConfig, metrics) podem ser atualizados'
      );
    }

    const updatedConfig = {
      ...(currentExercise.config || {}),
      ...newConfig
    };

    const { data, error } = await this.supabaseService.client
      .from('app_user_exercises')
      .update({ config: updatedConfig })
      .eq('id', exerciseId)
      .eq('user_id', userIdInt)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException('Falha ao atualizar configuração do exercício');
    }

    return data;
  }

  async getExerciseConfig(exerciseId: string, userId: string): Promise<any> {
    const userIdInt = await this.getUserIdFromUuid(userId);

    const { data: exercise, error } = await this.supabaseService.client
      .from('app_user_exercises')
      .select(`
        id,
        template_id,
        config,
        app_exercise_templates!inner (
          type,
          name,
          config,
          editable_fields
        )
      `)
      .eq('id', exerciseId)
      .eq('user_id', userIdInt)
      .single();

    if (error || !exercise) {
      throw new NotFoundException('Exercício não encontrado');
    }

    const template = (exercise as any).app_exercise_templates;

    if (!template.config) {
      throw new NotFoundException(
        `Nenhuma configuração encontrada para o tipo de exercício: ${template.type}.`
      );
    }

    // Merge: template.config + user overrides (exercise.config)
    const mergedConfig = this.mergeConfigs(template.config, exercise.config || {});

    this.logger.debug(
      `Merged config for exercise ${exerciseId} (type: ${template.type})`
    );

    return {
      exercise_name: template.name,
      config: mergedConfig,
      editable_fields: template.editable_fields || [],
      user_config: exercise.config || {}
    };
  }

  async getExerciseConfigByType(exerciseType: string, userId: string): Promise<any> {
    const userIdInt = await this.getUserIdFromUuid(userId);

    const { data: exercise, error } = await this.supabaseService.client
      .from('app_user_exercises')
      .select(`
        id,
        template_id,
        config,
        app_exercise_templates!inner (
          type,
          name,
          config,
          editable_fields
        )
      `)
      .eq('user_id', userIdInt)
      .eq('app_exercise_templates.type', exerciseType)
      .single();

    if (error || !exercise) {
      // No user_exercise record - return template config only
      const { data: template, error: templateError } = await this.supabaseService.client
        .from('app_exercise_templates')
        .select('type, name, config, editable_fields')
        .eq('type', exerciseType)
        .single();

      if (templateError || !template) {
        throw new NotFoundException(`Template de exercício não encontrado: ${exerciseType}`);
      }

      if (!template.config) {
        throw new NotFoundException(
          `Nenhuma configuração encontrada para o tipo de exercício: ${exerciseType}.`
        );
      }

      return {
        exerciseName: template.name,
        ...template.config
      };
    }

    const template = (exercise as any).app_exercise_templates;

    if (!template.config) {
      throw new NotFoundException(
        `Nenhuma configuração encontrada para o tipo de exercício: ${exerciseType}.`
      );
    }

    // Simple merge: template.config + user overrides
    const mergedConfig = this.mergeConfigs(template.config, exercise.config || {});

    this.logger.debug(
      `Merged config for exercise type ${exerciseType} (user: ${userIdInt})`
    );

    return {
      exerciseName: template.name,
      ...mergedConfig
    };
  }

  /**
   * Simple deep merge of two objects
   * Template config is base, user config overrides
   */
  private mergeConfigs(
    templateConfig: Record<string, any>,
    userConfig: Record<string, any>
  ): Record<string, any> {
    const mergeMetrics = this.mergeMetrics.bind(this);

    const mergeArrayByKey = <T extends Record<string, any>>(
      target: T[],
      source: Partial<T>[],
      key: keyof T
    ): T[] => {
      if (!Array.isArray(target)) return source as T[];
      if (!Array.isArray(source)) return target;

      const overridesByKey = new Map<string, Partial<T>>();
      const extras: Partial<T>[] = [];

      for (const item of source) {
        const itemKey = item?.[key];
        if (itemKey === undefined || itemKey === null || itemKey === '') {
          extras.push(item);
          continue;
        }
        overridesByKey.set(String(itemKey), item);
      }

      const merged = target.map((item) => {
        const itemKey = item?.[key];
        if (
          itemKey !== undefined &&
          itemKey !== null &&
          overridesByKey.has(String(itemKey))
        ) {
          const override = overridesByKey.get(String(itemKey))!;
          overridesByKey.delete(String(itemKey));
          return deepMerge(item, override);
        }
        return item;
      });

      for (const override of overridesByKey.values()) {
        merged.push(override as T);
      }

      for (const extra of extras) {
        merged.push(extra as T);
      }

      return merged;
    };

    const deepMerge = (target: any, source: any): any => {
      if (!source || typeof source !== 'object') return target;

      const result = { ...target };
      for (const key in source) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
          if (key === 'metrics') {
            result[key] = mergeMetrics(targetValue, sourceValue);
          } else if (key === 'checks') {
            result[key] = mergeArrayByKey(targetValue, sourceValue, 'id');
          } else if (key === 'states') {
            result[key] = mergeArrayByKey(targetValue, sourceValue, 'name');
          } else {
            result[key] = sourceValue;
          }
        } else if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          result[key] = deepMerge(targetValue || {}, sourceValue);
        } else if (sourceValue !== undefined) {
          result[key] = sourceValue;
        }
      }
      return result;
    };

    return deepMerge(templateConfig, userConfig);
  }

  private mergeMetrics(
    defaultMetrics: ExerciseMetric[],
    overrideMetrics: Partial<ExerciseMetric>[]
  ): ExerciseMetric[] {
    if (!overrideMetrics || overrideMetrics.length === 0) {
      return defaultMetrics;
    }

    const overrideMap = new Map<string, Partial<ExerciseMetric>>();
    overrideMetrics.forEach(metric => {
      if (metric.id) {
        overrideMap.set(metric.id, metric);
      }
    });

    return defaultMetrics.map(defaultMetric => {
      const override = overrideMap.get(defaultMetric.id);
      if (override) {
        return {
          ...defaultMetric,
          ...override
        };
      }
      return defaultMetric;
    });
  }

  private async getUserIdFromUuid(userUuid: string): Promise<number> {
    const { data, error } = await this.supabaseService.client
      .from('app_users')
      .select('id')
      .eq('auth_uid', userUuid)
      .single();

    if (error || !data) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return data.id;
  }
}
