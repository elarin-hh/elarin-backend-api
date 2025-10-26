import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';

@Injectable()
export class OrganizationService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getUsers(orgId: number) {
    const { data, error } = await this.supabaseService.client
      .from('memberships')
      .select(`
        *,
        users:user_id (
          id,
          email,
          full_name,
          avatar_url,
          created_at
        )
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new NotFoundException('Failed to fetch users');
    }

    return data || [];
  }

  async toggleUserStatus(orgId: number, userId: number) {
    const { data: membership } = await this.supabaseService.client
      .from('memberships')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const newStatus = !membership.is_active;

    const { error } = await this.supabaseService.client
      .from('memberships')
      .update({ is_active: newStatus })
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('Failed to update user status');
    }

    const { data: user } = await this.supabaseService.client
      .from('memberships')
      .select(`
        *,
        users:user_id (*)
      `)
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    return user;
  }

  async removeUser(orgId: number, userId: number) {
    const { error } = await this.supabaseService.client
      .from('memberships')
      .delete()
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) {
      throw new NotFoundException('Failed to remove user');
    }

    return { message: 'User removed successfully' };
  }

  async getStats(orgId: number) {
    const { data, error } = await this.supabaseService.client
      .from('memberships')
      .select('is_active')
      .eq('organization_id', orgId);

    if (error) {
      return {
        total_users: 0,
        active_users: 0,
        inactive_users: 0,
      };
    }

    const total_users = data.length;
    const active_users = data.filter((u) => u.is_active === true).length;
    const inactive_users = data.filter((u) => u.is_active === false).length;

    return {
      total_users,
      active_users,
      inactive_users,
    };
  }

  async getAllActiveOrganizations() {
    const { data, error } = await this.supabaseService.client
      .from('organizations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new NotFoundException('Failed to fetch active organizations');
    }

    return (data || []).map(org => {
      const { password_hash, ...sanitized } = org;
      return sanitized;
    });
  }

  async linkUserToOrganization(userId: number, orgId: number) {
    // Check if user already linked to this organization
    const { data: existingMembership } = await this.supabaseService.client
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    if (existingMembership) {
      return {
        message: 'User already linked to this organization',
        membership: existingMembership,
      };
    }

    // Create new membership (B2B)
    const { data, error } = await this.supabaseService.client
      .from('memberships')
      .insert({
        user_id: userId,
        organization_id: orgId,
        role: 'member',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new NotFoundException(`Failed to link user to organization: ${error.message}`);
    }

    return {
      message: 'User linked to organization successfully',
      membership: data,
    };
  }
}
