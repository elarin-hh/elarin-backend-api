import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import {
  AddTrainingPlanItemDto,
  AssignTrainingPlanDto,
  CreateTrainingPlanDto,
  UpdateTrainingPlanDto,
  UpdateTrainingPlanItemDto,
} from './dto';

type TemplateRecord = {
  id: number;
  type: string;
  name?: string | null;
  is_active?: boolean | null;
  config?: Record<string, unknown> | null;
};

type TemplateSummary = {
  id: number;
  type: string;
  name?: string | null;
  is_active?: boolean | null;
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
export class OrganizationTrainingPlansService {
  constructor(private readonly supabaseService: SupabaseService) { }

  async getPlans(organizationId: number) {
    const { data: plans, error } = await this.supabaseService.client
      .from('app_training_plans')
      .select('id, name, description, is_active, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch training plans');
    }

    if (!plans || plans.length === 0) {
      return [];
    }

    const planIds = plans.map((plan: any) => plan.id);

    const { data: items } = await this.supabaseService.client
      .from('app_training_plan_items')
      .select('plan_id')
      .in('plan_id', planIds);

    const { data: assignments } = await this.supabaseService.client
      .from('app_training_plan_assignments')
      .select('plan_id, is_active')
      .in('plan_id', planIds);

    const itemCounts = new Map<number, number>();
    (items || []).forEach((item: any) => {
      const count = itemCounts.get(item.plan_id) || 0;
      itemCounts.set(item.plan_id, count + 1);
    });

    const activeAssignments = new Map<number, number>();
    (assignments || []).forEach((assignment: any) => {
      if (!assignment.is_active) return;
      const count = activeAssignments.get(assignment.plan_id) || 0;
      activeAssignments.set(assignment.plan_id, count + 1);
    });

    return plans.map((plan: any) => ({
      ...plan,
      items_count: itemCounts.get(plan.id) || 0,
      active_assignments: activeAssignments.get(plan.id) || 0,
    }));
  }

  async createPlan(organizationId: number, dto: CreateTrainingPlanDto) {
    const { data, error } = await this.supabaseService.client
      .from('app_training_plans')
      .insert({
        organization_id: organizationId,
        name: dto.name,
        description: dto.description ?? null,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new InternalServerErrorException('Failed to create training plan');
    }

    return data;
  }

  async getPlan(organizationId: number, planId: number) {
    const { data, error } = await this.supabaseService.client
      .from('app_training_plans')
      .select(
        `
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      `,
      )
      .eq('id', planId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Training plan not found');
    }

    const { data: items, error: itemsError } = await this.supabaseService.client
      .from('app_training_plan_items')
      .select(
        `
        id,
        position,
        template_id,
        exercise_type,
        target_reps,
        target_duration_sec
      `,
      )
      .eq('plan_id', planId)
      .order('position', { ascending: true });

    if (itemsError) {
      throw new InternalServerErrorException('Failed to fetch plan items');
    }

    const hydratedItems = await this.attachTemplatesToItems(items || []);

    return {
      ...data,
      items: hydratedItems,
    };
  }

  async updatePlan(
    organizationId: number,
    planId: number,
    dto: UpdateTrainingPlanDto,
  ) {
    await this.getPlanOrThrow(organizationId, planId);

    const payload: Record<string, unknown> = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.description !== undefined) payload.description = dto.description;
    if (dto.is_active !== undefined) payload.is_active = dto.is_active;
    if (Object.keys(payload).length === 0) {
      return this.getPlan(organizationId, planId);
    }

    payload.updated_at = new Date().toISOString();

    const { data, error } = await this.supabaseService.client
      .from('app_training_plans')
      .update(payload)
      .eq('id', planId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error || !data) {
      throw new InternalServerErrorException('Failed to update training plan');
    }

    return data;
  }

  async deactivatePlan(organizationId: number, planId: number) {
    await this.getPlanOrThrow(organizationId, planId);

    const { error } = await this.supabaseService.client
      .from('app_training_plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new InternalServerErrorException('Failed to deactivate training plan');
    }

    return { message: 'Training plan deactivated' };
  }

  async deletePlan(organizationId: number, planId: number) {
    await this.getPlanOrThrow(organizationId, planId);

    const { error: itemsError } = await this.supabaseService.client
      .from('app_training_plan_items')
      .delete()
      .eq('plan_id', planId);

    if (itemsError) {
      throw new InternalServerErrorException('Failed to remove plan items');
    }

    const { error } = await this.supabaseService.client
      .from('app_training_plans')
      .delete()
      .eq('id', planId)
      .eq('organization_id', organizationId);

    if (error) {
      if (error.code === '23503') {
        throw new BadRequestException(
          'Cannot remove plan because it is in use (assigned to users). Please deactivate it instead.',
        );
      }
      throw new InternalServerErrorException('Failed to remove training plan');
    }

    return { message: 'Training plan removed' };
  }

  async addPlanItem(
    organizationId: number,
    planId: number,
    dto: AddTrainingPlanItemDto,
  ) {
    await this.getPlanOrThrow(organizationId, planId);

    const template = await this.getTemplate(dto.template_id);
    if (!template.is_active) {
      throw new BadRequestException('Template is inactive');
    }

    let position = dto.position;
    if (!position) {
      const { data: lastItem } = await this.supabaseService.client
        .from('app_training_plan_items')
        .select('position')
        .eq('plan_id', planId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      position = (lastItem?.position || 0) + 1;
    }

    const { data: item, error } = await this.supabaseService.client
      .from('app_training_plan_items')
      .insert({
        plan_id: planId,
        template_id: template.id,
        exercise_type: template.type,
        position,
        target_reps: dto.target_reps ?? null,
        target_duration_sec: dto.target_duration_sec ?? null,
      })
      .select(
        `
        id,
        position,
        template_id,
        exercise_type,
        target_reps,
        target_duration_sec
      `,
      )
      .single();

    if (error || !item) {
      throw new InternalServerErrorException('Failed to add plan item');
    }

    return {
      ...item,
      exercise_template: this.mapTemplateSummary(template),
    };
  }

  async updatePlanItem(
    organizationId: number,
    planId: number,
    itemId: number,
    dto: UpdateTrainingPlanItemDto,
  ) {
    await this.getPlanOrThrow(organizationId, planId);

    const payload: Record<string, unknown> = {};
    if (dto.position !== undefined) payload.position = dto.position;
    if (dto.target_reps !== undefined) payload.target_reps = dto.target_reps;
    if (dto.target_duration_sec !== undefined) {
      payload.target_duration_sec = dto.target_duration_sec;
    }

    if (Object.keys(payload).length === 0) {
      const { data: existingItem } = await this.supabaseService.client
        .from('app_training_plan_items')
        .select(
          `
          id,
          position,
          template_id,
          exercise_type,
          target_reps,
          target_duration_sec
        `,
        )
        .eq('id', itemId)
        .eq('plan_id', planId)
        .maybeSingle();
      if (!existingItem) {
        throw new NotFoundException('Plan item not found');
      }

      const template = existingItem.template_id
        ? await this.getTemplate(existingItem.template_id)
        : null;

      return {
        ...existingItem,
        exercise_template: this.mapTemplateSummary(template),
      };
    }

    const { data: updatedItem, error } = await this.supabaseService.client
      .from('app_training_plan_items')
      .update(payload)
      .eq('id', itemId)
      .eq('plan_id', planId)
      .select(
        `
        id,
        position,
        template_id,
        exercise_type,
        target_reps,
        target_duration_sec
      `,
      )
      .single();

    if (error || !updatedItem) {
      throw new InternalServerErrorException('Failed to update plan item');
    }

    const template = updatedItem.template_id
      ? await this.getTemplate(updatedItem.template_id)
      : null;

    return {
      ...updatedItem,
      exercise_template: this.mapTemplateSummary(template),
    };
  }

  async reorderItems(
    organizationId: number,
    planId: number,
    itemIds: number[],
  ) {
    await this.getPlanOrThrow(organizationId, planId);

    const { data: existingItems, error: fetchError } =
      await this.supabaseService.client
        .from('app_training_plan_items')
        .select('id')
        .eq('plan_id', planId);

    if (fetchError || !existingItems) {
      throw new InternalServerErrorException('Failed to fetch plan items');
    }

    const existingIds = new Set(existingItems.map((i) => i.id));
    const allValid = itemIds.every((id) => existingIds.has(id));

    if (!allValid || itemIds.length !== existingIds.size) {
      throw new BadRequestException(
        'Invalid item IDs provided. Ensure all items belong to this plan and are included.',
      );
    }

    const updates = itemIds.map((id, index) =>
      this.supabaseService.client
        .from('app_training_plan_items')
        .update({ position: index + 1 })
        .eq('id', id),
    );

    await Promise.all(updates);

    return this.getPlan(organizationId, planId);
  }

  async removePlanItem(organizationId: number, planId: number, itemId: number) {
    await this.getPlanOrThrow(organizationId, planId);

    const { data: itemToRemove, error: fetchError } =
      await this.supabaseService.client
        .from('app_training_plan_items')
        .select('position')
        .eq('id', itemId)
        .eq('plan_id', planId)
        .single();

    if (fetchError || !itemToRemove) {
      throw new NotFoundException('Plan item not found');
    }

    const { error } = await this.supabaseService.client
      .from('app_training_plan_items')
      .delete()
      .eq('id', itemId)
      .eq('plan_id', planId);

    if (error) {
      throw new InternalServerErrorException('Failed to remove plan item');
    }



    const { data: subsequentItems } = await this.supabaseService.client
      .from('app_training_plan_items')
      .select('id, position')
      .eq('plan_id', planId)
      .gt('position', itemToRemove.position);

    if (subsequentItems && subsequentItems.length > 0) {
      const updates = subsequentItems.map((item) =>
        this.supabaseService.client
          .from('app_training_plan_items')
          .update({ position: item.position - 1 })
          .eq('id', item.id),
      );
      await Promise.all(updates);
    }

    return { message: 'Plan item removed' };
  }

  async getUserAssignment(organizationId: number, userId: number) {
    await this.verifyUserInOrganization(organizationId, userId);

    const { data, error } = await this.supabaseService.client
      .from('app_training_plan_assignments')
      .select(
        `
        id,
        plan_id,
        user_id,
        is_active,
        assigned_at,
        plan:app_training_plans (
          id,
          name,
          description,
          is_active
        )
      `,
      )
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('Failed to fetch user assignment');
    }

    const plan = data ? normalizeSingle(data.plan) : null;

    if (!data || !plan || plan.is_active === false) {
      return null;
    }

    return { ...data, plan };
  }

  async assignPlanToUser(
    organizationId: number,
    userId: number,
    dto: AssignTrainingPlanDto,
  ) {
    await this.verifyUserInOrganization(organizationId, userId);

    const plan = await this.getPlanOrThrow(organizationId, dto.plan_id);
    if (plan.is_active === false) {
      throw new BadRequestException('Training plan is inactive');
    }

    const { data: existing } = await this.supabaseService.client
      .from('app_training_plan_assignments')
      .select('id')
      .eq('user_id', userId)
      .eq('plan_id', dto.plan_id)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException('User already has this plan assigned');
    }

    const { data: assignment, error } = await this.supabaseService.client
      .from('app_training_plan_assignments')
      .insert({
        plan_id: dto.plan_id,
        user_id: userId,
        organization_id: organizationId,
        is_active: true,
        assigned_at: new Date().toISOString(),
      })
      .select(
        `
        id,
        plan_id,
        user_id,
        is_active,
        assigned_at,
        plan:app_training_plans (
          id,
          name,
          description,
          is_active
        )
      `,
      )
      .single();

    if (error || !assignment) {
      throw new InternalServerErrorException('Failed to assign training plan');
    }

    await this.ensureUserExercises(userId, dto.plan_id);

    return assignment;
  }

  async removeAssignment(organizationId: number, userId: number) {
    await this.verifyUserInOrganization(organizationId, userId);

    const { error } = await this.supabaseService.client
      .from('app_training_plan_assignments')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) {
      throw new InternalServerErrorException('Failed to remove assignment');
    }

    return { message: 'Training plan assignment removed' };
  }

  private async ensureUserExercises(userId: number, planId: number) {
    const { data: items, error } = await this.supabaseService.client
      .from('app_training_plan_items')
      .select('template_id')
      .eq('plan_id', planId);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch plan items');
    }

    const templateIds = Array.from(
      new Set((items || []).map((item: any) => item.template_id).filter(Boolean)),
    );

    if (templateIds.length === 0) {
      return;
    }

    const { data: templates, error: templateError } =
      await this.supabaseService.client
        .from('app_exercise_templates')
        .select('id, type, is_active, config')
        .in('id', templateIds);

    if (templateError) {
      throw new InternalServerErrorException('Failed to fetch templates');
    }

    const inactive = (templates || []).find((t: any) => !t.is_active);
    if (inactive) {
      throw new BadRequestException('Plan includes inactive templates');
    }

    const { data: existingExercises } = await this.supabaseService.client
      .from('app_user_exercises')
      .select('id, template_id')
      .eq('user_id', userId)
      .in('template_id', templateIds);

    const existingTemplateIds = new Set(
      (existingExercises || []).map((ex: any) => ex.template_id),
    );

    const inserts = (templates || []).filter(
      (template: any) => !existingTemplateIds.has(template.id),
    );

    if (inserts.length === 0) {
      return;
    }

    const payload = inserts.map((template: any) => ({
      user_id: userId,
      template_id: template.id,
      is_active: true,
      config: {},
    }));

    const { error: insertError } = await this.supabaseService.client
      .from('app_user_exercises')
      .insert(payload);

    if (insertError) {
      throw new InternalServerErrorException('Failed to assign user exercises');
    }
  }

  private async verifyUserInOrganization(
    organizationId: number,
    userId: number,
  ) {
    const { data: membership, error } = await this.supabaseService.client
      .from('app_memberships')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !membership) {
      throw new ForbiddenException('User does not belong to your organization');
    }
  }

  private async getPlanOrThrow(organizationId: number, planId: number) {
    const { data, error } = await this.supabaseService.client
      .from('app_training_plans')
      .select('id, name, description, is_active')
      .eq('id', planId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Training plan not found');
    }

    return data;
  }

  private async getTemplate(templateId: number): Promise<TemplateRecord> {
    const { data, error } = await this.supabaseService.client
      .from('app_exercise_templates')
      .select('id, type, name, is_active, config')
      .eq('id', templateId)
      .single();

    if (error || !data) {
      throw new BadRequestException('Invalid exercise template');
    }

    return data as TemplateRecord;
  }

  private mapTemplateSummary(
    template: TemplateRecord | null,
  ): TemplateSummary | null {
    if (!template) {
      return null;
    }

    return {
      id: template.id,
      type: template.type,
      name: template.name ?? null,
      is_active: template.is_active ?? null,
    };
  }

  private async attachTemplatesToItems(items: any[]) {
    if (!items || items.length === 0) {
      return [];
    }

    const templateIds = Array.from(
      new Set(items.map((item) => item.template_id).filter(Boolean)),
    );

    if (templateIds.length === 0) {
      return items.map((item) => ({ ...item, exercise_template: null }));
    }

    const { data: templates, error } = await this.supabaseService.client
      .from('app_exercise_templates')
      .select('id, type, name, is_active')
      .in('id', templateIds);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch exercise templates');
    }

    const templateMap = new Map<number, TemplateSummary>();
    (templates || []).forEach((template: any) => {
      templateMap.set(template.id, template as TemplateSummary);
    });

    return items.map((item) => ({
      ...item,
      exercise_template: item.template_id
        ? templateMap.get(item.template_id) ?? null
        : null,
    }));
  }
  async getUserAssignments(organizationId: number, userId: number) {
    await this.verifyUserInOrganization(organizationId, userId);

    const { data, error } = await this.supabaseService.client
      .from('app_training_plan_assignments')
      .select(
        `
        id,
        plan_id,
        user_id,
        is_active,
        assigned_at,
        plan:app_training_plans (
          id,
          name,
          description,
          is_active
        )
      `,
      )
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch user assignments');
    }

    return (data || [])
      .map((assignment: any) => ({
        ...assignment,
        plan: normalizeSingle(assignment.plan),
      }))
      .filter(
        (assignment: any) =>
          assignment.plan && assignment.plan.is_active !== false,
      );
  }

  async removeAssignmentById(
    organizationId: number,
    userId: number,
    planId: number,
  ) {
    await this.verifyUserInOrganization(organizationId, userId);

    const { error } = await this.supabaseService.client
      .from('app_training_plan_assignments')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) {
      throw new InternalServerErrorException('Failed to remove assignment');
    }

    return { message: 'Training plan assignment removed' };
  }
}
