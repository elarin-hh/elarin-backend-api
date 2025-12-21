import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';

@Injectable()
export class OrganizationService {
  constructor(private readonly supabaseService: SupabaseService) { }

  async getUsers(orgId: number) {
    const { data, error } = await this.supabaseService.client
      .from('app_memberships')
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

  async getPendingUsers(orgId: number) {
    const { data, error } = await this.supabaseService.client
      .from('app_memberships')
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
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) {
      throw new NotFoundException('Failed to fetch pending users');
    }

    return data || [];
  }

  async approveUser(orgId: number, userId: number) {
    const { data: membership } = await this.supabaseService.client
      .from('app_memberships')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const { error } = await this.supabaseService.client
      .from('app_memberships')
      .update({
        status: 'ACTIVE',
        is_active: true
      })
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) {
      throw new NotFoundException('Failed to approve user');
    }

    const { data: updatedMembership } = await this.supabaseService.client
      .from('app_memberships')
      .select(`
        *,
        users:user_id (*)
      `)
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    return updatedMembership;
  }

  async rejectUser(orgId: number, userId: number) {
    const { data: membership } = await this.supabaseService.client
      .from('app_memberships')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const { error } = await this.supabaseService.client
      .from('app_memberships')
      .update({
        status: 'INACTIVE',
        is_active: false
      })
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) {
      throw new NotFoundException('Failed to reject user');
    }

    return { message: 'User rejected successfully' };
  }

  async toggleUserStatus(orgId: number, userId: number) {
    const { data: membership } = await this.supabaseService.client
      .from('app_memberships')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const newIsActive = !membership.is_active;
    const newStatus = newIsActive ? 'ACTIVE' : 'INACTIVE';

    const { error } = await this.supabaseService.client
      .from('app_memberships')
      .update({
        is_active: newIsActive,
        status: newStatus
      })
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('Failed to update user status');
    }

    const { data: user } = await this.supabaseService.client
      .from('app_memberships')
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
      .from('app_memberships')
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
      .from('app_memberships')
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
      .from('app_organizations')
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
      .from('app_memberships')
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
      .from('app_memberships')
      .insert({
        user_id: userId,
        organization_id: orgId,
        role: 'member',
        status: 'PENDING',
        is_active: false,
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

  async getMember(orgId: number, userId: number) {
    const { data, error } = await this.supabaseService.client
      .from('app_memberships')
      .select(`
        *,
        users:user_id (
          id,
          email,
          full_name,
          avatar_url,
          created_at,
          birth_date,
          height_cm,
          weight_kg
        )
      `)
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Member not found');
    }

    return data;
  }
}
