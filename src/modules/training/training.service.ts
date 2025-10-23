import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { CreateSessionDto, CompleteSessionDto } from './dto';

@Injectable()
export class TrainingService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Converte UUID do Supabase Auth para ID integer da tabela users
   */
  private async getUserIdFromUuid(userUuid: string): Promise<number> {
    const { data, error } = await this.supabaseService.client
      .from('users')
      .select('id')
      .eq('uuid', userUuid)
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
      .single();

    if (exerciseError || !exercise) {
      throw new NotFoundException('Exercise not found');
    }

    // Criar sessão
    const { data: session, error } = await this.supabaseService.client
      .from('training_sessions')
      .insert({
        user_id: userIdInt,
        exercise_type: createSessionDto.exercise_type,
        status: 'in_progress',
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException('Failed to create session');
    }

    return session;
  }

  async completeSession(userId: string, completeSessionDto: CompleteSessionDto) {
    const { session_id, ...sessionData } = completeSessionDto;

    // Converter UUID para ID integer
    const userIdInt = await this.getUserIdFromUuid(userId);

    // Verificar ownership
    const { data: session, error: sessionError } = await this.supabaseService.client
      .from('training_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', userIdInt)
      .single();

    if (sessionError || !session) {
      throw new NotFoundException('Session not found');
    }

    // Atualizar sessão
    const { error: updateError } = await this.supabaseService.client
      .from('training_sessions')
      .update({
        ...sessionData,
        status: 'completed',
        finished_at: new Date().toISOString(),
      })
      .eq('id', session_id);

    if (updateError) {
      throw new InternalServerErrorException('Failed to update session');
    }

    return { session_id };
  }

  async getHistory(userId: string, limit = 20, offset = 0) {
    // Converter UUID para ID integer
    const userIdInt = await this.getUserIdFromUuid(userId);

    const { data, error } = await this.supabaseService.client
      .from('training_sessions')
      .select(`
        *,
        exercises:exercise_type (name_pt, name_en, category)
      `)
      .eq('user_id', userIdInt)
      .eq('status', 'completed')
      .order('finished_at', { ascending: false })
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
      .from('training_sessions')
      .select(`
        *,
        exercises:exercise_type (*)
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
