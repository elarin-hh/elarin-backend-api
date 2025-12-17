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
  ) {}

  /**
   * Assign exercise from template to user
   */
  async assignExerciseToUser(
    organizationId: number,
    targetUserId: number,
    templateId: number,
  ): Promise<any> {
    // 1. Verify target user belongs to organization
    await this.verifyUserInOrganization(organizationId, targetUserId);

    // 2. Validate template exists and is active
    const template = await this.exerciseTemplatesService.getTemplateById(templateId);
    if (!template || !template.is_active) {
      throw new BadRequestException('Invalid or inactive exercise template');
    }

    // 3. Check if user already has this exercise type (UNIQUE constraint)
    const { data: existing } = await this.supabaseService.client
      .from('exercises')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('type', template.type)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('User already has this exercise type');
    }

    // 4. Create exercise record
    const { data, error } = await this.supabaseService.client
      .from('exercises')
      .insert({
        user_id: targetUserId,
        type: template.type,
        name: template.name,
        template_id: templateId,
        is_active: template.is_active,
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException('Failed to assign exercise');
    }

    return data;
  }

  /**
   * Remove exercise from user
   */
  async removeExerciseFromUser(
    organizationId: number,
    targetUserId: number,
    exerciseId: number,
  ): Promise<void> {
    // 1. Verify target user belongs to organization
    await this.verifyUserInOrganization(organizationId, targetUserId);

    // 2. Verify exercise belongs to user
    const { data: exercise } = await this.supabaseService.client
      .from('exercises')
      .select('id, user_id')
      .eq('id', exerciseId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!exercise) {
      throw new NotFoundException('Exercise not found or does not belong to user');
    }

    // 3. Delete exercise
    const { error } = await this.supabaseService.client
      .from('exercises')
      .delete()
      .eq('id', exerciseId);

    if (error) {
      throw new InternalServerErrorException('Failed to remove exercise');
    }
  }

  /**
   * List user's exercises (admin view)
   */
  async getUserExercises(
    organizationId: number,
    targetUserId: number,
  ): Promise<any[]> {
    // 1. Verify target user belongs to organization
    await this.verifyUserInOrganization(organizationId, targetUserId);

    // 2. Fetch user's exercises
    const { data, error } = await this.supabaseService.client
      .from('exercises')
      .select('id, type, name, is_active, created_at, template_id')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch exercises');
    }

    return data || [];
  }

  /**
   * Verify user belongs to organization
   * @throws ForbiddenException if user does not belong to organization
   */
  private async verifyUserInOrganization(
    organizationId: number,
    userId: number,
  ): Promise<void> {
    const { data: membership, error } = await this.supabaseService.client
      .from('memberships')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !membership) {
      throw new ForbiddenException('User does not belong to your organization');
    }
  }
}
