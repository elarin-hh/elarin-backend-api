import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { CreateNotificationDto } from './dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Get all active notifications for a specific organization
   * Includes global notifications (where organization_id is null)
   */
  async getNotifications(organizationId: number) {
    const { data, error } = await this.supabaseService.client
      .from('notifications')
      .select('*')
      .eq('is_active', true)
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new NotFoundException('Failed to fetch notifications');
    }

    // Filter out expired notifications
    const now = new Date();
    const activeNotifications = (data || []).filter(notification => {
      if (!notification.expires_at) return true;
      return new Date(notification.expires_at) > now;
    });

    return activeNotifications;
  }

  /**
   * Get all notifications (admin endpoint)
   * Returns all notifications regardless of status or expiration
   */
  async getAllNotifications() {
    const { data, error } = await this.supabaseService.client
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new NotFoundException('Failed to fetch all notifications');
    }

    return data || [];
  }

  /**
   * Create a new notification
   */
  async createNotification(createNotificationDto: CreateNotificationDto) {
    const { data, error } = await this.supabaseService.client
      .from('notifications')
      .insert({
        organization_id: createNotificationDto.organization_id || null,
        title: createNotificationDto.title,
        description: createNotificationDto.description,
        icon: createNotificationDto.icon || 'megaphone',
        color: createNotificationDto.color || 'primary',
        is_active: createNotificationDto.is_active ?? true,
        expires_at: createNotificationDto.expires_at || null,
      })
      .select()
      .single();

    if (error) {
      throw new NotFoundException(`Failed to create notification: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: number) {
    const { error } = await this.supabaseService.client
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      throw new NotFoundException('Failed to delete notification');
    }

    return { message: 'Notification deleted successfully' };
  }

  /**
   * Toggle notification active status
   */
  async toggleNotificationStatus(notificationId: number) {
    const { data: notification } = await this.supabaseService.client
      .from('notifications')
      .select('is_active')
      .eq('id', notificationId)
      .single();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const { data, error } = await this.supabaseService.client
      .from('notifications')
      .update({ is_active: !notification.is_active })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('Failed to toggle notification status');
    }

    return data;
  }
}
