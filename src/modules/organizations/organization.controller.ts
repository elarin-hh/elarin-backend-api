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
  Req,
  ParseIntPipe,
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
  ) { }

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
  @ApiResponse({ status: 404, description: 'Usuário ou organização não encontrados' })
  async linkUserToOrganization(@Body() linkUserDto: LinkUserDto) {
    return this.organizationService.linkUserToOrganization(linkUserDto.user_id, linkUserDto.organization_id);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get organization profile' })
  @ApiResponse({ status: 200, description: 'Organization profile returned successfully' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getProfile(@Req() request: any) {
    return { organization: request.organization };
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users linked to organization' })
  @ApiResponse({ status: 200, description: 'Users list retrieved' })
  async getUsers(@Req() request: any) {
    return this.organizationService.getUsers(request.organization.id);
  }

  @Get('users/pending')
  @ApiOperation({ summary: 'Get pending users awaiting approval' })
  @ApiResponse({ status: 200, description: 'Pending users list retrieved' })
  async getPendingUsers(@Req() request: any) {
    return this.organizationService.getPendingUsers(request.organization.id);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get a single user from organization' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getMember(
    @Req() request: any,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.organizationService.getMember(request.organization.id, userId);
  }

  @Patch('users/:userId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve pending user' })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User approved successfully' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async approveUser(
    @Req() request: any,
    @Param('userId') userId: number,
  ) {
    return this.organizationService.approveUser(request.organization.id, userId);
  }

  @Patch('users/:userId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject pending user' })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User rejected successfully' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async rejectUser(
    @Req() request: any,
    @Param('userId') userId: number,
  ) {
    return this.organizationService.rejectUser(request.organization.id, userId);
  }

  @Patch('users/:userId/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle user status (active/inactive)' })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async toggleUserStatus(
    @Req() request: any,
    @Param('userId') userId: number,
  ) {
    return this.organizationService.toggleUserStatus(request.organization.id, userId);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove user from organization' })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User removed successfully' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async removeUser(
    @Req() request: any,
    @Param('userId') userId: number,
  ) {
    return this.organizationService.removeUser(request.organization.id, userId);
  }

  @Get('users/stats')
  @ApiOperation({ summary: 'Get organization user statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats(@Req() request: any) {
    return this.organizationService.getStats(request.organization.id);
  }
}
