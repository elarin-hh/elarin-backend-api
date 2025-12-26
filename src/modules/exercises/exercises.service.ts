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
      throw new InternalServerErrorException('Failed to fetch exercises');
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
      throw new NotFoundException('Exercise not found');
    }

    if (!validateOverride(newConfig)) {
      throw new InternalServerErrorException(
        'Invalid config: only variable fields (heuristicConfig, metrics) can be updated'
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
      throw new InternalServerErrorException('Failed to update exercise config');
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
      throw new NotFoundException(`Exercise not found`);
    }

    const template = (exercise as any).app_exercise_templates;

    if (!template.config) {
      throw new NotFoundException(
        `No configuration found for exercise type: ${template.type}. Please populate database with exercise templates.`
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
        throw new NotFoundException(`Exercise template not found: ${exerciseType}`);
      }

      if (!template.config) {
        throw new NotFoundException(
          `No configuration found for exercise type: ${exerciseType}. Please populate database.`
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
        `No configuration found for exercise type: ${exerciseType}.`
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
    const deepMerge = (target: any, source: any): any => {
      if (!source || typeof source !== 'object') return target;

      const result = { ...target };
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = deepMerge(result[key] || {}, source[key]);
        } else if (source[key] !== undefined) {
          result[key] = source[key];
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
      throw new NotFoundException('User not found');
    }

    return data.id;
  }
}
