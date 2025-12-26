import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { ExerciseTemplatesService } from './exercise-templates.service';

@Injectable()
export class OrganizationExerciseAdminService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly exerciseTemplatesService: ExerciseTemplatesService,
  ) { }

  async assignExerciseToUser(
    organizationId: number,
    targetUserId: number,
    templateId: number,
  ): Promise<any> {
    await this.verifyUserInOrganization(organizationId, targetUserId);

    const template = await this.exerciseTemplatesService.getTemplateById(templateId);
    if (!template || !template.is_active) {
      throw new BadRequestException('Invalid or inactive exercise template');
    }

    const { data: userExercises } = await this.supabaseService.client
      .from('app_user_exercises')
      .select('id, template_id')
      .eq('user_id', targetUserId);

    if (userExercises && userExercises.length > 0) {
      const templateIds = userExercises.map((e: any) => e.template_id).filter(Boolean);

      if (templateIds.length > 0) {
        const { data: userTemplates } = await this.supabaseService.client
          .from('app_exercise_templates')
          .select('id, type')
          .in('id', templateIds);

        const hasType = userTemplates?.some((t: any) => t.type === template.type);
        if (hasType) {
          throw new ConflictException('User already has this exercise type');
        }
      }
    }

    const { data, error } = await this.supabaseService.client
      .from('app_user_exercises')
      .insert({
        user_id: targetUserId,
        template_id: templateId,
        is_active: template.is_active,
        config: {}
      })
      .select()
      .single();

    if (error) {
      console.error('Assign Exercise Error:', error);
      throw new InternalServerErrorException('Failed to assign exercise: ' + error.message);
    }

    return {
      ...data,
      type: template.type,
      name: template.name,
    };
  }

  async removeExerciseFromUser(
    organizationId: number,
    targetUserId: number,
    exerciseId: number,
  ): Promise<void> {
    await this.verifyUserInOrganization(organizationId, targetUserId);

    const { data: exercise } = await this.supabaseService.client
      .from('app_user_exercises')
      .select('id, user_id')
      .eq('id', exerciseId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!exercise) {
      throw new NotFoundException('Exercise not found or does not belong to user');
    }

    const { error } = await this.supabaseService.client
      .from('app_user_exercises')
      .delete()
      .eq('id', exerciseId);

    if (error) {
      console.error('Remove Exercise Error:', error);
      throw new InternalServerErrorException('Failed to remove exercise: ' + error.message);
    }
  }

  async getUserExercises(
    organizationId: number,
    targetUserId: number,
  ): Promise<any[]> {
    await this.verifyUserInOrganization(organizationId, targetUserId);

    const { data: exercises, error } = await this.supabaseService.client
      .from('app_user_exercises')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get Exercises Error:', error);
      throw new InternalServerErrorException('Failed to fetch exercises: ' + error.message);
    }

    if (!exercises || exercises.length === 0) {
      return [];
    }

    const templateIds = exercises.map((e: any) => e.template_id).filter(Boolean);
    const uniqueTemplateIds = [...new Set(templateIds)];

    let templatesMap: Record<number, any> = {};

    if (uniqueTemplateIds.length > 0) {
      const { data: templates } = await this.supabaseService.client
        .from('app_exercise_templates')
        .select('id, type, name')
        .in('id', uniqueTemplateIds);

      if (templates) {
        templates.forEach((t: any) => {
          templatesMap[t.id] = t;
        });
      }
    }

    return exercises.map((ex: any) => {
      const template = templatesMap[ex.template_id];
      return {
        id: ex.id,
        user_id: targetUserId,
        template_id: ex.template_id,
        is_active: ex.is_active,
        created_at: ex.created_at,
        config: ex.config,
        type: template?.type || 'unknown',
        name: template?.name || 'Unknown Exercise'
      };
    });
  }

  async getExerciseFullConfig(
    organizationId: number,
    userId: number,
    exerciseId: number,
  ) {
    await this.verifyUserInOrganization(organizationId, userId);

    const { data: exercise, error } = await this.supabaseService.client
      .from('app_user_exercises')
      .select(`
        *,
        template:app_exercise_templates (
          id,
          type,
          name,
          config,
          editable_fields
        )
      `)
      .eq('id', exerciseId)
      .eq('user_id', userId)
      .single();

    if (error || !exercise) {
      throw new NotFoundException('Exercise not found');
    }

    return {
      exercise_id: exercise.id,
      exercise_name: exercise.template.name,
      config: exercise.template.config || {},
      editable_fields: exercise.template.editable_fields || [],
      user_config: exercise.config || {},
    };
  }

  async updateUserExerciseConfig(
    organizationId: number,
    userId: number,
    exerciseId: number,
    newConfig: Record<string, any>,
  ) {
    await this.verifyUserInOrganization(organizationId, userId);

    const { data: exercise } = await this.supabaseService.client
      .from('app_user_exercises')
      .select(`
        *,
        template:app_exercise_templates (
          config,
          editable_fields
        )
      `)
      .eq('id', exerciseId)
      .eq('user_id', userId)
      .single();

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const { data, error } = await this.supabaseService.client
      .from('app_user_exercises')
      .update({ config: newConfig })
      .eq('id', exerciseId)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException('Failed to update config');
    }

    return data;
  }

  async updateTemplateConfig(
    templateId: number,
    newConfig: Record<string, any>,
  ) {
    const template = await this.exerciseTemplatesService.getTemplateById(templateId);
    if (!template) {
      throw new NotFoundException('Exercise template not found');
    }

    const { data, error } = await this.supabaseService.client
      .from('app_exercise_templates')
      .update({
        config: newConfig,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Update Template Config Error:', error);
      throw new InternalServerErrorException('Failed to update template config: ' + error.message);
    }

    return data;
  }


  private async verifyUserInOrganization(
    organizationId: number,
    userId: number,
  ): Promise<void> {
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
}
