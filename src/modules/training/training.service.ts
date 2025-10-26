import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { CreateSessionDto, CompleteSessionDto } from './dto';

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
      .from('users')
      .select('id')
      .eq('auth_uid', userUuid)
      .single();

    if (error || !data) {
      throw new NotFoundException('User not found');
    }

    return data.id;
  }

  async createSession(userId: string, createSessionDto: CreateSessionDto) {
    // Converter UUID para ID integer
    const userIdInt = await this.getUserIdFromUuid(userId);

    // Verificar se exercício existe
    const { data: exercise, error: exerciseError } = await this.supabaseService.client
      .from('exercises')
      .select('*')
      .eq('type', createSessionDto.exercise_type)
      .eq('is_active', true)
      .single();

    if (exerciseError || !exercise) {
      throw new NotFoundException('Exercise not found');
    }

    // Obter organization_id se o usuário estiver vinculado a alguma organização (B2B)
    // Para B2C, organization_id será null
    const { data: membership } = await this.supabaseService.client
      .from('memberships')
      .select('organization_id')
      .eq('user_id', userIdInt)
      .eq('is_active', true)
      .not('organization_id', 'is', null) // Apenas memberships com organização
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Criar sessão (suporta B2C e B2B)
    const { data: session, error } = await this.supabaseService.client
      .from('sessions')
      .insert({
        user_id: userIdInt,
        organization_id: membership?.organization_id || null, // null = B2C, não-null = B2B
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException('Failed to create session');
    }

    return {
      ...session,
      exercise_type: createSessionDto.exercise_type, // Para compatibilidade com frontend
    };
  }

  async completeSession(userId: string, completeSessionDto: CompleteSessionDto) {
    const { session_id, reps_completed, sets_completed, duration_seconds, avg_confidence } = completeSessionDto;

    // Converter UUID para ID integer
    const userIdInt = await this.getUserIdFromUuid(userId);

    // Verificar ownership
    const { data: session, error: sessionError } = await this.supabaseService.client
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', userIdInt)
      .single();

    if (sessionError || !session) {
      throw new NotFoundException('Session not found');
    }

    // Atualizar sessão
    const { error: updateError } = await this.supabaseService.client
      .from('sessions')
      .update({
        ended_at: new Date().toISOString(),
      })
      .eq('id', session_id);

    if (updateError) {
      throw new InternalServerErrorException('Failed to update session');
    }

    // Criar registro de métricas (assumindo que o exercise_type vem do createSession)
    // Por enquanto, vamos buscar da sessão ou usar um valor default
    const { error: metricsError } = await this.supabaseService.client
      .from('metrics')
      .insert({
        session_id: session_id,
        exercise: 'squat', // Nota: precisamos passar isso do frontend ou armazenar na sessão
        reps: reps_completed || 0,
        duration_ms: (duration_seconds || 0) * 1000,
        valid_ratio: avg_confidence || 0,
      });

    if (metricsError) {
      this.logger.warn(`Failed to create metrics for session ${session_id}:`, metricsError);
    }

    return { session_id };
  }

  async getHistory(userId: string, limit = 20, offset = 0) {
    // Converter UUID para ID integer
    const userIdInt = await this.getUserIdFromUuid(userId);

    const { data, error } = await this.supabaseService.client
      .from('sessions')
      .select(`
        *,
        metrics (*)
      `)
      .eq('user_id', userIdInt)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch history');
    }

    return data;
  }

  async getSessionDetails(userId: string, sessionId: number) {
    // Converter UUID para ID integer
    const userIdInt = await this.getUserIdFromUuid(userId);

    const { data, error } = await this.supabaseService.client
      .from('sessions')
      .select(`
        *,
        metrics (*)
      `)
      .eq('id', sessionId)
      .eq('user_id', userIdInt)
      .single();

    if (error || !data) {
      throw new NotFoundException('Session not found');
    }

    return data;
  }
}
