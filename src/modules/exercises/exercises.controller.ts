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
import { ExercisesService } from './exercises.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('exercises')
@UseGuards(JwtAuthGuard)
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) { }

  @Get()
  async getUserExercises(@Req() req: any) {
    return this.exercisesService.getUserExercises(req.user.id);
  }

  @Get(':id/full-config')
  async getFullConfig(@Req() req: any, @Param('id') id: string) {
    return this.exercisesService.getExerciseConfig(id, req.user.id);
  }

  @Patch(':id/config')
  async updateExerciseConfig(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { config: Record<string, any> }
  ) {
    return this.exercisesService.updateExerciseConfig(id, req.user.id, body.config);
  }

  @Get('by-type/:type/config')
  async getExerciseConfigByType(
    @Param('type') exerciseType: string,
    @Req() req: any
  ) {
    return this.exercisesService.getExerciseConfigByType(exerciseType, req.user.id);
  }
}
