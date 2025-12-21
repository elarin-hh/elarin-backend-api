import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Patch
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ExercisesService } from './exercises.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'; // Assuming JwtAuthGuard is the correct one based on @UseGuards
import { CurrentUser } from '../../common/decorators/current-user.decorator'; // Keeping this import as it was in the original, though not used in the provided new methods

@ApiTags('Exercises')
@Controller('exercises')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) { }

  @Get()
  @ApiOperation({ summary: 'Get all exercises for the current user (active and inactive)' })
  @ApiResponse({ status: 200, description: 'List of all user exercises' })
  async getUserExercises(@Req() req: any) {
    return this.exercisesService.getUserExercises(req.user.id);
  }

  @Get(':id/full-config')
  @ApiOperation({ summary: 'Get complete exercise configuration with user customizations' })
  async getFullConfig(@Req() req: any, @Param('id') id: string) {
    return this.exercisesService.getExerciseFullConfig(id, req.user.id);
  }

  @Patch(':id/config')
  async updateExerciseConfig(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { config: Record<string, any> }
  ) {
    return this.exercisesService.updateExerciseConfig(id, req.user.id, body.config);
  }
}
