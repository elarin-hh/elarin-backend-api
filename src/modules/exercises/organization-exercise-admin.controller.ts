import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Patch,
} from '@nestjs/common';
import { OrganizationExerciseAdminService } from './organization-exercise-admin.service';
import { ExerciseTemplatesService } from './exercise-templates.service';
import { OrganizationAuthGuard } from '../organizations/guards/organization-auth.guard';
import { OrganizationRoute } from '../../common/decorators/organization-route.decorator';
import { AssignExerciseDto } from './dto/assign-exercise.dto';
import { UpdateUserExerciseConfigDto } from './dto/update-template-config.dto';


@Controller('organizations')
@UseGuards(OrganizationAuthGuard)
@OrganizationRoute()
export class OrganizationExerciseAdminController {
  constructor(
    private readonly organizationExerciseAdminService: OrganizationExerciseAdminService,
    private readonly exerciseTemplatesService: ExerciseTemplatesService,
  ) { }

  @Get('exercise-templates')
  async getAllExerciseTemplates() {
    return this.exerciseTemplatesService.getAllTemplates();
  }

  @Get('exercise-templates/:templateId')
  async getExerciseTemplate(
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.exerciseTemplatesService.getTemplateById(templateId);
  }

  @Get('users/:userId/exercises')
  async getUserExercises(
    @Req() request: any,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.organizationExerciseAdminService.getUserExercises(request.organization.id, userId);
  }

  @Post('users/:userId/exercises')
  @HttpCode(HttpStatus.CREATED)
  async assignExercise(
    @Req() request: any,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() assignExerciseDto: AssignExerciseDto,
  ) {
    return this.organizationExerciseAdminService.assignExerciseToUser(
      request.organization.id,
      userId,
      assignExerciseDto.template_id,
    );
  }

  @Delete('users/:userId/exercises/:exerciseId')
  @HttpCode(HttpStatus.OK)
  async removeExerciseFromUser(
    @Req() request: any,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
  ) {
    return this.organizationExerciseAdminService.removeExerciseFromUser(
      request.organization.id,
      userId,
      exerciseId,
    );
  }

  @Get('users/:userId/exercises/:exerciseId/config')
  async getExerciseConfig(
    @Req() request: any,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
  ) {
    return this.organizationExerciseAdminService.getExerciseFullConfig(
      request.organization.id,
      userId,
      exerciseId,
    );
  }

  @Patch('users/:userId/exercises/:exerciseId/config')
  async updateExerciseConfig(
    @Req() request: any,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
    @Body() updateDto: UpdateUserExerciseConfigDto,
  ) {
    return this.organizationExerciseAdminService.updateUserExerciseConfig(
      request.organization.id,
      userId,
      exerciseId,
      updateDto.config,
    );
  }
}
