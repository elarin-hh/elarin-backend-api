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
import { OrganizationAuthGuard } from '../organizations/guards/organization-auth.guard';
import { OrganizationRoute } from '../../common/decorators/organization-route.decorator';
import {
  AddTrainingPlanItemDto,
  AssignTrainingPlanDto,
  CreateTrainingPlanDto,
  ReorderTrainingPlanItemsDto,
  UpdateTrainingPlanDto,
  UpdateTrainingPlanItemDto,
} from './dto';
import { OrganizationTrainingPlansService } from './organization-training-plans.service';

@Controller('organizations')
@UseGuards(OrganizationAuthGuard)
@OrganizationRoute()
export class OrganizationTrainingPlansController {
  constructor(
    private readonly trainingPlansService: OrganizationTrainingPlansService,
  ) { }

  @Get('training-plans')
  async getPlans(@Req() request: any) {
    return this.trainingPlansService.getPlans(request.organization.id);
  }

  @Post('training-plans')
  async createPlan(
    @Req() request: any,
    @Body() dto: CreateTrainingPlanDto,
  ) {
    return this.trainingPlansService.createPlan(request.organization.id, dto);
  }

  @Get('training-plans/:planId')
  async getPlan(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    return this.trainingPlansService.getPlan(request.organization.id, planId);
  }

  @Patch('training-plans/:planId')
  async updatePlan(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: UpdateTrainingPlanDto,
  ) {
    return this.trainingPlansService.updatePlan(request.organization.id, planId, dto);
  }

  @Patch('training-plans/:planId/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivatePlan(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    return this.trainingPlansService.deactivatePlan(request.organization.id, planId);
  }

  @Delete('training-plans/:planId')
  @HttpCode(HttpStatus.OK)
  async deletePlan(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    return this.trainingPlansService.deletePlan(request.organization.id, planId);
  }

  @Post('training-plans/:planId/items')
  async addPlanItem(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: AddTrainingPlanItemDto,
  ) {
    return this.trainingPlansService.addPlanItem(request.organization.id, planId, dto);
  }

  @Patch('training-plans/:planId/items/reorder')
  async reorderItems(
    @Req() request: any,
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: ReorderTrainingPlanItemsDto,
  ) {
    return this.trainingPlansService.reorderItems(
      request.organization.id,
      planId,
      dto.item_ids,
    );
  }

  @Patch('training-plans/:planId/items/:itemId')
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
