import { Controller, Post, Get, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { TrainingService } from './training.service';
import { SaveTrainingDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('training')
@UseGuards(JwtAuthGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post('save')
  @HttpCode(HttpStatus.CREATED)
  async saveTraining(
    @CurrentUser('id') userId: string,
    @Body() saveTrainingDto: SaveTrainingDto,
  ) {
    return this.trainingService.saveTraining(userId, saveTrainingDto);
  }

  @Get('history')
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.trainingService.getHistory(userId, limit, offset);
  }

  @Get(':id')
  async getTrainingDetails(
    @CurrentUser('id') userId: string,
    @Param('id') metricId: number,
  ) {
    return this.trainingService.getTrainingDetails(userId, metricId);
  }
}
