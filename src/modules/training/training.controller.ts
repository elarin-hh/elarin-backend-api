import { Controller, Post, Get, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TrainingService } from './training.service';
import { SaveTrainingDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Training')
@Controller('training')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post('save')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save completed training session' })
  @ApiResponse({ status: 201, description: 'Training saved successfully' })
  @ApiResponse({ status: 404, description: 'Exercício não encontrado' })
  async saveTraining(
    @CurrentUser('id') userId: string,
    @Body() saveTrainingDto: SaveTrainingDto,
  ) {
    return this.trainingService.saveTraining(userId, saveTrainingDto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get training history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Training history retrieved' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.trainingService.getHistory(userId, limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get training details' })
  @ApiParam({ name: 'id', description: 'Training metric ID', type: Number })
  @ApiResponse({ status: 200, description: 'Training details retrieved' })
  @ApiResponse({ status: 404, description: 'Treino não encontrado' })
  async getTrainingDetails(
    @CurrentUser('id') userId: string,
    @Param('id') metricId: number,
  ) {
    return this.trainingService.getTrainingDetails(userId, metricId);
  }
}
