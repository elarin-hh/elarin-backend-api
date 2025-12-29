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
import { OrganizationService } from './organization.service';
import { OrganizationAuthService } from './organization-auth.service';
import { OrganizationAuthGuard } from './guards/organization-auth.guard';
import { CurrentOrganization } from './decorators/current-organization.decorator';
import { OrganizationRoute } from '../../common/decorators/organization-route.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { LinkUserDto } from './dto';

@Controller('organizations')
@UseGuards(OrganizationAuthGuard)
@OrganizationRoute()
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly organizationAuthService: OrganizationAuthService,
  ) { }

  @Get('active')
  @Public()
  async getAllActiveOrganizations() {
    return this.organizationService.getAllActiveOrganizations();
  }

  @Post('link-user')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async linkUserToOrganization(@Body() linkUserDto: LinkUserDto) {
    return this.organizationService.linkUserToOrganization(linkUserDto.user_id, linkUserDto.organization_id);
  }

  @Get('profile')
  async getProfile(@Req() request: any) {
    return { organization: request.organization };
  }

  @Get('users')
  async getUsers(@Req() request: any) {
    return this.organizationService.getUsers(request.organization.id);
  }

  @Get('users/pending')
  async getPendingUsers(@Req() request: any) {
    return this.organizationService.getPendingUsers(request.organization.id);
  }

  @Get('users/:userId')
  async getMember(
    @Req() request: any,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.organizationService.getMember(request.organization.id, userId);
  }

  @Patch('users/:userId/approve')
  @HttpCode(HttpStatus.OK)
  async approveUser(
    @Req() request: any,
    @Param('userId') userId: number,
  ) {
    return this.organizationService.approveUser(request.organization.id, userId);
  }

  @Patch('users/:userId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectUser(
    @Req() request: any,
    @Param('userId') userId: number,
  ) {
    return this.organizationService.rejectUser(request.organization.id, userId);
  }

  @Patch('users/:userId/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleUserStatus(
    @Req() request: any,
    @Param('userId') userId: number,
  ) {
    return this.organizationService.toggleUserStatus(request.organization.id, userId);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.OK)
  async removeUser(
    @Req() request: any,
    @Param('userId') userId: number,
  ) {
    return this.organizationService.removeUser(request.organization.id, userId);
  }

  @Get('users/stats')
  async getStats(@Req() request: any) {
    return this.organizationService.getStats(request.organization.id);
  }
}
