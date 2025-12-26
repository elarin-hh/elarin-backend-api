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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { OrganizationExerciseAdminService } from './organization-exercise-admin.service';
import { ExerciseTemplatesService } from './exercise-templates.service';
import { OrganizationAuthGuard } from '../organizations/guards/organization-auth.guard';
import { OrganizationRoute } from '../../common/decorators/organization-route.decorator';
import { AssignExerciseDto } from './dto/assign-exercise.dto';
import { UpdateUserExerciseConfigDto } from './dto/update-template-config.dto';


@ApiTags('Organization Exercise Management')
@Controller('organizations')
@UseGuards(OrganizationAuthGuard)
@ApiBearerAuth()
@OrganizationRoute()
export class OrganizationExerciseAdminController {
  constructor(
    private readonly organizationExerciseAdminService: OrganizationExerciseAdminService,
    private readonly exerciseTemplatesService: ExerciseTemplatesService,
  ) { }

  @Get('exercise-templates')
  @ApiOperation({ summary: 'List all exercise templates with configurations' })
  @ApiResponse({ status: 200, description: 'List of exercise templates' })
  async getAllExerciseTemplates() {
    return this.exerciseTemplatesService.getAllTemplates();
  }

  @Get('exercise-templates/:templateId')
  @ApiOperation({ summary: 'Get single exercise template with full configuration' })
  @ApiParam({ name: 'templateId', description: 'Template ID', type: Number })
  @ApiResponse({ status: 200, description: 'Exercise template details' })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async getExerciseTemplate(
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.exerciseTemplatesService.getTemplateById(templateId);
  }

  @Get('users/:userId/exercises')
  @ApiOperation({ summary: "Get a user's assigned exercises (admin view)" })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: "User's exercises retrieved" })
  @ApiResponse({ status: 403, description: 'Usuário não pertence à organização' })
  async getUserExercises(
    @Req() request: any,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.organizationExerciseAdminService.getUserExercises(request.organization.id, userId);
  }

  @Post('users/:userId/exercises')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign exercise to user from template' })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 201, description: 'Exercise assigned successfully' })
  @ApiResponse({ status: 400, description: 'Template inválido ou inativo' })
  @ApiResponse({ status: 403, description: 'Usuário não pertence à organização' })
  @ApiResponse({ status: 409, description: 'Usuário já possui este tipo de exercício' })
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
  @ApiOperation({ summary: 'Remove exercise from user' })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiParam({ name: 'exerciseId', description: 'Exercise ID', type: Number })
  @ApiResponse({ status: 200, description: 'Exercise removed successfully' })
  @ApiResponse({ status: 403, description: 'Usuário não pertence à organização' })
  @ApiResponse({ status: 404, description: 'Exercício não encontrado' })
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
  @ApiOperation({ summary: 'Get full exercise configuration' })
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
  @ApiOperation({ summary: 'Update user-specific exercise configuration overrides' })
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
