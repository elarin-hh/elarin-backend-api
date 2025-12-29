import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { TrainingPlansService } from './training-plans.service';

@Controller('training-plans')
export class TrainingPlansController {
  constructor(private readonly trainingPlansService: TrainingPlansService) { }

  @Get('assigned')
  async getAssignedPlans(@Req() req: any) {
    return this.trainingPlansService.getAssignedPlans(req.user.id);
  }

  @Post(':planId/start')
  async startPlan(@Req() req: any, @Param('planId', ParseIntPipe) planId: number) {
    return this.trainingPlansService.startSession(req.user.id, planId);
  }

  @Post('sessions/:sessionId/finish')
  @HttpCode(HttpStatus.OK)
  async finishPlan(@Req() req: any, @Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.trainingPlansService.finishSession(req.user.id, sessionId);
  }
}
