import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { SaveTrainingDto } from './dto';

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Converte UUID do Supabase Auth para ID integer da tabela users
   * Suporta B2C e B2B
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

  /**
   * Obter organization_id do usuário (para B2B)
   * Retorna null para B2C
   */
  private async getOrganizationId(userIdInt: number): Promise<number | null> {
    const { data: membership } = await this.supabaseService.client
      .from('app_memberships')
      .select('organization_id')
      .eq('user_id', userIdInt)
      .eq('is_active', true)
      .not('organization_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return membership?.organization_id || null;
  }

  /**
   * Salvar resultado de treino completo
   * Substitui createSession + completeSession
   */
  async saveTraining(userId: string, saveTrainingDto: SaveTrainingDto) {
    // Converter UUID para ID integer
    const userIdInt = await this.getUserIdFromUuid(userId);

    // Verificar se exercício existe
    const { data: exercise, error: exerciseError } = await this.supabaseService.client
      .from('app_user_exercises')
      .select('id, app_exercise_templates!inner ( type )')
      .eq('user_id', userIdInt)
      .eq('is_active', true)
      .eq('app_exercise_templates.type', saveTrainingDto.exercise_type)
      .single();

    if (exerciseError || !exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const hasPlanContext =
      Boolean(saveTrainingDto.plan_session_id) ||
      Boolean(saveTrainingDto.plan_item_id) ||
      typeof saveTrainingDto.sequence_index === 'number';

    if (hasPlanContext) {
      if (
        !saveTrainingDto.plan_session_id ||
        !saveTrainingDto.plan_item_id ||
        typeof saveTrainingDto.sequence_index !== 'number'
      ) {
        throw new BadRequestException('Incomplete training plan context');
      }

      await this.validatePlanContext(
        userIdInt,
        saveTrainingDto.plan_session_id,
        saveTrainingDto.plan_item_id,
        saveTrainingDto.exercise_type,
      );
    }

    // Obter organization_id (B2B) ou null (B2C)
    const organizationId = await this.getOrganizationId(userIdInt);

    // Criar registro de métricas diretamente
    const { data: metric, error: metricsError } = await this.supabaseService.client
      .from('app_training_sessions')
      .insert({
        user_id: userIdInt,
        organization_id: organizationId,
        exercise: saveTrainingDto.exercise_type,
        reps: saveTrainingDto.reps_completed || 0,
        sets: saveTrainingDto.sets_completed || 1,
        duration_ms: (saveTrainingDto.duration_seconds || 0) * 1000,
        valid_ratio: saveTrainingDto.avg_confidence || 0,
        plan_session_id: saveTrainingDto.plan_session_id || null,
        plan_item_id: saveTrainingDto.plan_item_id || null,
        sequence_index:
          typeof saveTrainingDto.sequence_index === 'number'
            ? saveTrainingDto.sequence_index
            : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (metricsError) {
      this.logger.error('Failed to save training metrics:', metricsError);
      throw new InternalServerErrorException('Failed to save training');
    }

    return metric;
  }

  /**
   * Buscar histórico de treinos do usuário
   */
  async getHistory(userId: string, limit = 20, offset = 0) {
    // Converter UUID para ID integer
    const userIdInt = await this.getUserIdFromUuid(userId);

    const { data, error } = await this.supabaseService.client
      .from('app_training_sessions')
      .select('*')
      .eq('user_id', userIdInt)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to fetch history:', error);
      throw new InternalServerErrorException('Failed to fetch history');
    }

    return data;
  }

  /**
   * Buscar detalhes de um treino específico
   */
  async getTrainingDetails(userId: string, metricId: number) {
    // Converter UUID para ID integer
    const userIdInt = await this.getUserIdFromUuid(userId);

    const { data, error } = await this.supabaseService.client
      .from('app_training_sessions')
      .select('*')
      .eq('id', metricId)
      .eq('user_id', userIdInt)
      .single();

    if (error || !data) {
      throw new NotFoundException('Training not found');
    }

    return data;
  }

  private async validatePlanContext(
    userId: number,
    planSessionId: number,
    planItemId: number,
    exerciseType: string,
  ) {
    const { data: planSession, error: sessionError } =
      await this.supabaseService.client
        .from('app_training_plan_sessions')
        .select('id, plan_id, user_id, status')
        .eq('id', planSessionId)
        .eq('user_id', userId)
        .maybeSingle();

    if (sessionError || !planSession) {
      throw new BadRequestException('Invalid plan session');
    }

    if (planSession.status !== 'in_progress') {
      throw new BadRequestException('Plan session is not active');
    }

    const { data: planItem, error: itemError } =
      await this.supabaseService.client
        .from('app_training_plan_items')
        .select(
          `
          id,
          plan_id,
          exercise_type,
          template_id
        `,
        )
        .eq('id', planItemId)
        .eq('plan_id', planSession.plan_id)
        .maybeSingle();

    if (itemError || !planItem) {
      throw new BadRequestException('Invalid plan item');
    }

    let expectedType = planItem.exercise_type || null;

    if (!expectedType && planItem.template_id) {
      const { data: template, error: templateError } =
        await this.supabaseService.client
          .from('app_exercise_templates')
          .select('type')
          .eq('id', planItem.template_id)
          .maybeSingle();

      if (templateError || !template) {
        throw new BadRequestException('Invalid plan item template');
      }

      expectedType = template.type || null;
    }

    if (expectedType && expectedType !== exerciseType) {
      throw new BadRequestException('Exercise does not match plan item');
    }
  }
}
