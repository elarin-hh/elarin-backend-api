import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { OrganizationAuthGuard } from '../organizations/guards/organization-auth.guard';
import { CurrentOrganization } from '../organizations/decorators/current-organization.decorator';
import { OrganizationRoute } from '../../common/decorators/organization-route.decorator';
import { CreateNotificationDto } from './dto';

@ApiTags('Notifications')
@Controller('organizations/notifications')
@UseGuards(OrganizationAuthGuard)
@ApiBearerAuth()
@OrganizationRoute()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get active notifications for current organization' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotifications(@CurrentOrganization('id') organizationId: number) {
    return this.notificationsService.getNotifications(organizationId);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all notifications (admin)' })
  @ApiResponse({ status: 200, description: 'All notifications retrieved' })
  async getAllNotifications() {
    return this.notificationsService.getAllNotifications();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new notification (admin)' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.createNotification(createNotificationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification (admin)' })
  @ApiParam({ name: 'id', description: 'Notification ID', type: Number })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(@Param('id') id: number) {
    return this.notificationsService.deleteNotification(id);
  }

  @Patch(':id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle notification active status (admin)' })
  @ApiParam({ name: 'id', description: 'Notification ID', type: Number })
  @ApiResponse({ status: 200, description: 'Notification status toggled' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async toggleNotificationStatus(@Param('id') id: number) {
    return this.notificationsService.toggleNotificationStatus(id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read/dismissed for current organization' })
  @ApiParam({ name: 'id', description: 'Notification ID', type: Number })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id') id: number,
    @CurrentOrganization('id') organizationId: number
  ) {
    return this.notificationsService.markAsRead(id, organizationId);
  }
}
