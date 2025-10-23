import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';

@Injectable()
export class GymService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getUsers(gymId: number) {
    const { data, error } = await this.supabaseService.client
      .from('gym_users_view')
      .select('*')
      .eq('gym_id', gymId)
      .order('linked_at', { ascending: false });

    if (error) {
      throw new NotFoundException('Failed to fetch users');
    }

    return data || [];
  }

  async toggleUserStatus(gymId: number, userId: number) {
    const { data: link } = await this.supabaseService.client
      .from('gym_user_links')
      .select('*')
      .eq('gym_id', gymId)
      .eq('user_id', userId)
      .single();

    if (!link) {
      throw new NotFoundException('User link not found');
    }

    const newStatus = link.status === 'active' ? 'inactive' : 'active';

    const { data, error } = await this.supabaseService.client
      .from('gym_user_links')
      .update({ status: newStatus })
      .eq('gym_id', gymId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('Failed to update user status');
    }

    const { data: user } = await this.supabaseService.client
      .from('gym_users_view')
      .select('*')
      .eq('gym_id', gymId)
      .eq('user_id', userId)
      .single();

    return user;
  }

  async removeUser(gymId: number, userId: number) {
    const { error } = await this.supabaseService.client
      .from('gym_user_links')
      .delete()
      .eq('gym_id', gymId)
      .eq('user_id', userId);

    if (error) {
      throw new NotFoundException('Failed to remove user');
    }

    return { message: 'User removed successfully' };
  }

  async getStats(gymId: number) {
    const { data, error } = await this.supabaseService.client
      .from('gym_user_links')
      .select('status')
      .eq('gym_id', gymId);

    if (error) {
      return {
        total_users: 0,
        active_users: 0,
        inactive_users: 0,
      };
    }

    const total_users = data.length;
    const active_users = data.filter((u) => u.status === 'active').length;
    const inactive_users = data.filter((u) => u.status === 'inactive').length;

    return {
      total_users,
      active_users,
      inactive_users,
    };
  }
}
