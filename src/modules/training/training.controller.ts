import { Controller, Post, Get, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TrainingService } from './training.service';
import { CreateSessionDto, CompleteSessionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Training')
@Controller('training')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new training session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiResponse({ status: 404, description: 'Exercise not found' })
  async createSession(
    @CurrentUser('id') userId: string,
    @Body() createSessionDto: CreateSessionDto,
  ) {
    return this.trainingService.createSession(userId, createSessionDto);
  }

  @Post('sessions/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete training session' })
  @ApiResponse({ status: 200, description: 'Session completed successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async completeSession(
    @CurrentUser('id') userId: string,
    @Body() completeSessionDto: CompleteSessionDto,
  ) {
    return this.trainingService.completeSession(userId, completeSessionDto);
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

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get session details' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Session details retrieved' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionDetails(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.trainingService.getSessionDetails(userId, sessionId);
  }
}
