import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';

type PlanItemRecord = {
  id: number;
  position: number;
  template_id: number | null;
  exercise_type: string | null;
  target_reps?: number | null;
  target_sets?: number | null;
  target_duration_sec?: number | null;
  rest_seconds?: number | null;
  exercise_template?: {
    type?: string | null;
    name?: string | null;
    name_pt?: string | null;
  };
};

type TemplateSummary = {
  id: number;
  type?: string | null;
  name?: string | null;
  name_pt?: string | null;
};

const normalizeSingle = <T>(
  value: T | T[] | null | undefined,
): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
};

@Injectable()
export class TrainingPlansService {
  constructor(private readonly supabaseService: SupabaseService) {}

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

  private mapPlanItems(
    items: PlanItemRecord[],
    templateMap?: Map<number, TemplateSummary>,
  ) {
    return (items || [])
      .map((item) => {
        const template =
          item.exercise_template ||
          (item.template_id ? templateMap?.get(item.template_id) : null);
        return {
          id: item.id,
          position: item.position,
          template_id: item.template_id,
          exercise_type: item.exercise_type || template?.type || null,
          exercise_name: template?.name_pt || template?.name || null,
          target_reps: item.target_reps ?? null,
          target_sets: item.target_sets ?? null,
          target_duration_sec: item.target_duration_sec ?? null,
          rest_seconds: item.rest_seconds ?? null,
        };
      })
      .sort((a, b) => a.position - b.position);
  }

  private async getPlanItems(planId: number) {
    const { data, error } = await this.supabaseService.client
      .from('app_training_plan_items')
      .select(
        `
        id,
        position,
        template_id,
        exercise_type,
        target_reps,
        target_sets,
        target_duration_sec,
        rest_seconds
      `,
      )
      .eq('plan_id', planId)
      .order('position', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch plan items');
    }

    const items = (data as PlanItemRecord[]) || [];
    if (items.length === 0) {
      return [];
    }

    const templateIds = Array.from(
      new Set(items.map((item) => item.template_id).filter(Boolean)),
    );

    let templateMap: Map<number, TemplateSummary> | undefined;
    if (templateIds.length > 0) {
      const { data: templates, error: templateError } =
        await this.supabaseService.client
          .from('app_exercise_templates')
          .select('id, type, name, name_pt')
          .in('id', templateIds);

      if (templateError) {
        throw new InternalServerErrorException(
          'Failed to fetch plan templates',
        );
      }

      templateMap = new Map<number, TemplateSummary>();
      (templates || []).forEach((template: any) => {
        templateMap?.set(template.id, template as TemplateSummary);
      });
    }

    return this.mapPlanItems(items, templateMap);
  }

  async getAssignedPlan(userUuid: string) {
    const userIdInt = await this.getUserIdFromUuid(userUuid);

    const { data: assignment, error } = await this.supabaseService.client
      .from('app_training_plan_assignments')
      .select('id, plan_id')
      .eq('user_id', userIdInt)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new InternalServerErrorException('Failed to fetch assigned plan');
    }

    if (!assignment) {
      return null;
    }

    const { data: plan, error: planError } = await this.supabaseService.client
      .from('app_training_plans')
      .select('id, name, description, is_active')
      .eq('id', assignment.plan_id)
      .maybeSingle();

    if (planError || !plan || plan.is_active === false) {
      return null;
    }

    const items = await this.getPlanItems(plan.id);

    return {
      assignment_id: assignment.id,
      plan_id: plan.id,
      name: plan.name,
      description: plan.description,
      items,
    };
  }

  async startSession(userUuid: string, planId: number) {
    const userIdInt = await this.getUserIdFromUuid(userUuid);

    const { data: assignment, error: assignmentError } =
      await this.supabaseService.client
        .from('app_training_plan_assignments')
        .select('id, plan_id')
        .eq('user_id', userIdInt)
        .eq('plan_id', planId)
        .eq('is_active', true)
        .maybeSingle();

    if (assignmentError) {
      throw new InternalServerErrorException('Failed to fetch assignment');
    }

    if (!assignment) {
      throw new NotFoundException('Assigned plan not found');
    }

    const { data: plan, error: planError } = await this.supabaseService.client
      .from('app_training_plans')
      .select('id, name, description, is_active')
      .eq('id', assignment.plan_id)
      .maybeSingle();

    if (planError || !plan || plan.is_active === false) {
      throw new NotFoundException('Assigned plan not found');
    }

    const { data: existingSession, error: existingError } =
      await this.supabaseService.client
        .from('app_training_plan_sessions')
        .select('id, status')
        .eq('assignment_id', assignment.id)
        .eq('user_id', userIdInt)
        .eq('status', 'in_progress')
        .maybeSingle();

    if (existingError) {
      throw new InternalServerErrorException(
        'Failed to fetch existing plan session',
      );
    }

    const items = await this.getPlanItems(planId);

    if (existingSession) {
      return {
        session_id: existingSession.id,
        plan_id: plan.id,
        plan_name: plan.name,
        plan_description: plan.description,
        assignment_id: assignment.id,
        items,
      };
    }

    const { data: session, error: sessionError } =
      await this.supabaseService.client
        .from('app_training_plan_sessions')
        .insert({
          plan_id: plan.id,
          user_id: userIdInt,
          assignment_id: assignment.id,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (sessionError) {
      throw new InternalServerErrorException('Failed to create plan session');
    }

    return {
      session_id: session.id,
      plan_id: plan.id,
      plan_name: plan.name,
      plan_description: plan.description,
      assignment_id: assignment.id,
      items,
    };
  }

  async finishSession(userUuid: string, sessionId: number) {
    const userIdInt = await this.getUserIdFromUuid(userUuid);

    const { data: session, error: fetchError } =
      await this.supabaseService.client
        .from('app_training_plan_sessions')
        .select('id, status')
        .eq('id', sessionId)
        .eq('user_id', userIdInt)
        .maybeSingle();

    if (fetchError) {
      throw new InternalServerErrorException('Failed to fetch plan session');
    }

    if (!session) {
      throw new NotFoundException('Plan session not found');
    }

    if (session.status === 'completed') {
      return { message: 'Plan session already completed' };
    }

    const { error: updateError } = await this.supabaseService.client
      .from('app_training_plan_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      throw new InternalServerErrorException('Failed to finish plan session');
    }

    return { message: 'Plan session completed' };
  }
}
