import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationAuthGuard } from '../organizations/guards/organization-auth.guard';
import { OrganizationRoute } from '../../common/decorators/organization-route.decorator';
import {
  AddTrainingPlanItemDto,
  AssignTrainingPlanDto,
  CreateTrainingPlanDto,
  UpdateTrainingPlanDto,
  UpdateTrainingPlanItemDto,
} from './dto';
import { OrganizationTrainingPlansService } from './organization-training-plans.service';

@ApiTags('Organization Training Plans')
@Controller('organizations')
@UseGuards(OrganizationAuthGuard)
@ApiBearerAuth()
@OrganizationRoute()
export class OrganizationTrainingPlansController {
  constructor(
    private readonly trainingPlansService: OrganizationTrainingPlansService,
  ) { }

  @Get('training-plans')
  @ApiOperation({ summary: 'List training plans for organization' })
  @ApiResponse({ status: 200, description: 'Training plans retrieved' })
  async getPlans(@Req() request: any) {
    return this.trainingPlansService.getPlans(request.organization.id);
  }

  @Post('training-plans')
  @ApiOperation({ summary: 'Create training plan' })
  @ApiResponse({ status: 201, description: 'Training plan created' })
  async createPlan(
    @Req() request: any,
    @Body() dto: CreateTrainingPlanDto,
  ) {
    return this.trainingPlansService.createPlan(request.organization.id, dto);
  }

  @Get('training-plans/:planId')
  @ApiOperation({ summary: 'Get training plan details' })
  @ApiParam({ name: 'planId', type: Number })
  async getPlan(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    return this.trainingPlansService.getPlan(request.organization.id, planId);
  }

  @Patch('training-plans/:planId')
  @ApiOperation({ summary: 'Update training plan' })
  @ApiParam({ name: 'planId', type: Number })
  async updatePlan(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: UpdateTrainingPlanDto,
  ) {
    return this.trainingPlansService.updatePlan(request.organization.id, planId, dto);
  }

  @Patch('training-plans/:planId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate training plan' })
  @ApiParam({ name: 'planId', type: Number })
  async deactivatePlan(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    return this.trainingPlansService.deactivatePlan(request.organization.id, planId);
  }

  @Delete('training-plans/:planId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove training plan' })
  @ApiParam({ name: 'planId', type: Number })
  async deletePlan(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    return this.trainingPlansService.deletePlan(request.organization.id, planId);
  }

  @Post('training-plans/:planId/items')
  @ApiOperation({ summary: 'Add training plan item' })
  @ApiParam({ name: 'planId', type: Number })
  async addPlanItem(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: AddTrainingPlanItemDto,
  ) {
    return this.trainingPlansService.addPlanItem(request.organization.id, planId, dto);
  }

  @Patch('training-plans/:planId/items/:itemId')
  @ApiOperation({ summary: 'Update training plan item' })
  @ApiParam({ name: 'planId', type: Number })
  @ApiParam({ name: 'itemId', type: Number })
  async updatePlanItem(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateTrainingPlanItemDto,
  ) {
    return this.trainingPlansService.updatePlanItem(
      request.organization.id,
      planId,
      itemId,
      dto,
    );
  }

  @Delete('training-plans/:planId/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove training plan item' })
  @ApiParam({ name: 'planId', type: Number })
  @ApiParam({ name: 'itemId', type: Number })
  async removePlanItem(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.trainingPlansService.removePlanItem(
      request.organization.id,
      planId,
      itemId,
    );
  }

  @Get('users/:userId/training-plans')
  @ApiOperation({ summary: 'Get active training plan assignments for user' })
  @ApiParam({ name: 'userId', type: Number })
  async getUserAssignments(
    @Req() request: any,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.trainingPlansService.getUserAssignments(
      request.organization.id,
      userId,
    );
  }

  @Post('users/:userId/training-plans')
  @ApiOperation({ summary: 'Assign training plan to user' })
  @ApiParam({ name: 'userId', type: Number })
  async assignPlan(
    @Req() request: any,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AssignTrainingPlanDto,
  ) {
    return this.trainingPlansService.assignPlanToUser(
      request.organization.id,
      userId,
      dto,
    );
  }

  @Delete('users/:userId/training-plans/:planId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove training plan assignment from user' })
  @ApiParam({ name: 'userId', type: Number })
  @ApiParam({ name: 'planId', type: Number })
  async removeAssignment(
    @Req() request: any,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    return this.trainingPlansService.removeAssignmentById(
      request.organization.id,
      userId,
      planId,
    );
  }
}
