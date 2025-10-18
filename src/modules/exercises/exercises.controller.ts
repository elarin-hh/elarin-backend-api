import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ExercisesService } from './exercises.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Exercises')
@Controller('exercises')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all exercises (active and inactive)' })
  @ApiResponse({ status: 200, description: 'List of all exercises' })
  async getAll() {
    return this.exercisesService.getAll();
  }

  @Get(':type')
  @ApiOperation({ summary: 'Get exercise by type' })
  @ApiParam({ name: 'type', description: 'Exercise type' })
  @ApiResponse({ status: 200, description: 'Exercise details' })
  @ApiResponse({ status: 404, description: 'Exercise not found' })
  async getByType(@Param('type') type: string) {
    return this.exercisesService.getByType(type);
  }
}
