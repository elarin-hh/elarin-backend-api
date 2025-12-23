import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TrainingPlansService } from './training-plans.service';

@ApiTags('Training Plans')
@ApiBearerAuth()
@Controller('training-plans')
export class TrainingPlansController {
  constructor(private readonly trainingPlansService: TrainingPlansService) {}

  @Get('assigned')
  @ApiOperation({ summary: 'Get active assigned training plan for current user' })
  @ApiResponse({ status: 200, description: 'Assigned training plan retrieved' })
  async getAssignedPlan(@Req() req: any) {
    return this.trainingPlansService.getAssignedPlan(req.user.id);
  }

  @Post(':planId/start')
  @ApiOperation({ summary: 'Start a training plan session' })
  @ApiParam({ name: 'planId', type: Number })
  @ApiResponse({ status: 201, description: 'Training plan session created' })
  async startPlan(@Req() req: any, @Param('planId', ParseIntPipe) planId: number) {
    return this.trainingPlansService.startSession(req.user.id, planId);
  }

  @Post('sessions/:sessionId/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finish a training plan session' })
  @ApiParam({ name: 'sessionId', type: Number })
  @ApiResponse({ status: 200, description: 'Training plan session finished' })
  async finishPlan(@Req() req: any, @Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.trainingPlansService.finishSession(req.user.id, sessionId);
  }
}
