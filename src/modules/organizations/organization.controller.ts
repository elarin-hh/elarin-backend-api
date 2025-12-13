import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { OrganizationAuthService } from './organization-auth.service';
import { OrganizationAuthGuard } from './guards/organization-auth.guard';
import { CurrentOrganization } from './decorators/current-organization.decorator';
import { OrganizationRoute } from '../../common/decorators/organization-route.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { LinkUserDto } from './dto';

@ApiTags('Organization Management')
@Controller('organizations')
@UseGuards(OrganizationAuthGuard)
@ApiBearerAuth()
@OrganizationRoute()
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly organizationAuthService: OrganizationAuthService,
  ) {}

  @Get('active')
  @Public()
  @ApiOperation({ summary: 'Get all active organizations' })
  @ApiResponse({ status: 200, description: 'List of active organizations retrieved' })
  async getAllActiveOrganizations() {
    return this.organizationService.getAllActiveOrganizations();
  }

  @Post('link-user')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link a user to an organization' })
  @ApiResponse({ status: 201, description: 'User linked to organization successfully' })
  @ApiResponse({ status: 404, description: 'User or organization not found' })
  async linkUserToOrganization(@Body() linkUserDto: LinkUserDto) {
    return this.organizationService.linkUserToOrganization(linkUserDto.user_id, linkUserDto.organization_id);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current organization profile' })
  @ApiResponse({ status: 200, description: 'Organization profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentOrganization('id') organizationId: number) {
    return this.organizationAuthService.getProfile(organizationId);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users linked to organization' })
  @ApiResponse({ status: 200, description: 'Users list retrieved' })
  async getUsers(@CurrentOrganization('id') organizationId: number) {
    return this.organizationService.getUsers(organizationId);
  }

  @Get('users/pending')
  @ApiOperation({ summary: 'Get pending users awaiting approval' })
  @ApiResponse({ status: 200, description: 'Pending users list retrieved' })
  async getPendingUsers(@CurrentOrganization('id') organizationId: number) {
    return this.organizationService.getPendingUsers(organizationId);
  }

  @Patch('users/:userId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve pending user' })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User approved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async approveUser(
    @CurrentOrganization('id') organizationId: number,
    @Param('userId') userId: number,
  ) {
    return this.organizationService.approveUser(organizationId, userId);
  }

  @Patch('users/:userId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject pending user' })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User rejected successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async rejectUser(
    @CurrentOrganization('id') organizationId: number,
    @Param('userId') userId: number,
  ) {
    return this.organizationService.rejectUser(organizationId, userId);
  }

  @Patch('users/:userId/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle user status (active/inactive)' })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async toggleUserStatus(
    @CurrentOrganization('id') organizationId: number,
    @Param('userId') userId: number,
  ) {
    return this.organizationService.toggleUserStatus(organizationId, userId);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove user from organization' })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User removed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async removeUser(
    @CurrentOrganization('id') organizationId: number,
    @Param('userId') userId: number,
  ) {
    return this.organizationService.removeUser(organizationId, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get organization statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats(@CurrentOrganization('id') organizationId: number) {
    return this.organizationService.getStats(organizationId);
  }
}
