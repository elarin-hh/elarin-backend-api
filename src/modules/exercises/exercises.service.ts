import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { StaticConfigService } from './static-config.service';
import {
  type ExerciseConfigOverride,
  type MergedExerciseConfig,
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
    private readonly supabaseService: SupabaseService,
    private readonly staticConfigService: StaticConfigService
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
        .from('app_user_exercises')
        .select('config')
        .eq('id', exerciseId)
        .eq('user_id', userIdInt)
        .single();

    if (fetchError || !currentExercise) {
      throw new NotFoundException('Exercise not found');
    }

    // Validate that newConfig only contains variable fields
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

  async getExerciseConfig(exerciseId: string, userId: string): Promise<MergedExerciseConfig> {
    const userIdInt = await this.getUserIdFromUuid(userId);

    const { data: exercise, error } = await this.supabaseService.client
      .from('app_user_exercises')
      .select(`
        id,
        template_id,
        config,
        app_exercise_templates!inner (
          type,
          name
        )
      `)
      .eq('id', exerciseId)
      .eq('user_id', userIdInt)
      .single();

    if (error || !exercise) {
      throw new NotFoundException(`Exercise not found`);
    }

    const exerciseType = (exercise as any).app_exercise_templates.type;
    const staticConfig = await this.staticConfigService.loadStaticConfig(exerciseType);

    if (!staticConfig) {
      throw new NotFoundException(
        `No static config found for exercise type: ${exerciseType}`
      );
    }

    const mergedConfig = this.mergeConfigs(staticConfig, exercise.config || {});

    this.logger.debug(
      `Merged config for exercise ${exerciseId} (type: ${exerciseType})`
    );

    return mergedConfig;
  }

  /**
   * Merge static configuration with database overrides
   * Fixed fields are NEVER overridden, only variable fields are merged
   */
  private mergeConfigs(
    staticConfig: any,
    dbOverrides: ExerciseConfigOverride
  ): MergedExerciseConfig {
    const fixed = staticConfig._fixed;
    const defaults = staticConfig._defaults;

    // 1. Start with fixed heuristic config (if any)
    // 2. Apply defaults (variable params)
    // 3. Apply database overrides (user params)
    // 4. Re-apply fixed params (CRITICAL: ensures partial fixed values usually win)
    const heuristicConfig = {
      ...(fixed.heuristicConfig || {}),
      ...defaults.heuristicConfig,
      ...(dbOverrides.heuristicConfig || {}),
      ...(fixed.heuristicConfig || {}) // Safety: Fixed ALWAYS wins
    };

    // Merge metrics (if present in overrides)
    const metrics = this.mergeMetrics(
      defaults.metrics || [],
      dbOverrides.metrics || []
    );

    return {
      exerciseName: staticConfig.exerciseName,
      modelPath: staticConfig.modelPath,

      // Fixed fields (from _fixed section)
      feedbackCooldownMs: fixed.feedbackCooldownMs,
      analysisInterval: fixed.analysisInterval,
      mlConfig: fixed.mlConfig,
      feedbackConfig: fixed.feedbackConfig,
      components: fixed.components,

      // Variable fields (merged)
      heuristicConfig,
      metrics,

      completion: staticConfig.completion
    };
  }

  /**
   * Merge metrics arrays, allowing overrides by metric id
   */
  private mergeMetrics(
    defaultMetrics: ExerciseMetric[],
    overrideMetrics: Partial<ExerciseMetric>[]
  ): ExerciseMetric[] {
    if (!overrideMetrics || overrideMetrics.length === 0) {
      return defaultMetrics;
    }

    // Create a map of overrides by id
    const overrideMap = new Map<string, Partial<ExerciseMetric>>();
    overrideMetrics.forEach(metric => {
      if (metric.id) {
        overrideMap.set(metric.id, metric);
      }
    });

    // Merge each default metric with its override (if exists)
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

  /**
   * Helper: Obter user_id (integer) a partir do UUID do Supabase Auth
   */
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
