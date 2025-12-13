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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { OrganizationExerciseAdminService } from './organization-exercise-admin.service';
import { ExerciseTemplatesService } from './exercise-templates.service';
import { OrganizationAuthGuard } from '../organizations/guards/organization-auth.guard';
import { CurrentOrganization } from '../organizations/decorators/current-organization.decorator';
import { OrganizationRoute } from '../../common/decorators/organization-route.decorator';
import { AssignExerciseDto } from './dto/assign-exercise.dto';

@ApiTags('Organization Exercise Management')
@Controller('organizations')
@UseGuards(OrganizationAuthGuard)
@ApiBearerAuth()
@OrganizationRoute()
export class OrganizationExerciseAdminController {
  constructor(
    private readonly organizationExerciseAdminService: OrganizationExerciseAdminService,
    private readonly exerciseTemplatesService: ExerciseTemplatesService,
  ) {}

  @Get('exercise-templates')
  @ApiOperation({ summary: 'List available exercise templates for assignment' })
  @ApiResponse({ status: 200, description: 'List of exercise templates' })
  async getExerciseTemplates() {
    return this.exerciseTemplatesService.getActiveTemplates();
  }

  @Get('users/:userId/exercises')
  @ApiOperation({ summary: "Get a user's assigned exercises (admin view)" })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: "User's exercises retrieved" })
  @ApiResponse({ status: 403, description: 'User not in organization' })
  async getUserExercises(
    @CurrentOrganization('id') organizationId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.organizationExerciseAdminService.getUserExercises(organizationId, userId);
  }

  @Post('users/:userId/exercises')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign exercise to user from template' })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 201, description: 'Exercise assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or inactive template' })
  @ApiResponse({ status: 403, description: 'User not in organization' })
  @ApiResponse({ status: 409, description: 'User already has this exercise type' })
  async assignExercise(
    @CurrentOrganization('id') organizationId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() assignExerciseDto: AssignExerciseDto,
  ) {
    return this.organizationExerciseAdminService.assignExerciseToUser(
      organizationId,
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
  @ApiResponse({ status: 403, description: 'User not in organization' })
  @ApiResponse({ status: 404, description: 'Exercise not found' })
  async removeExercise(
    @CurrentOrganization('id') organizationId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
  ) {
    await this.organizationExerciseAdminService.removeExerciseFromUser(
      organizationId,
      userId,
      exerciseId,
    );
    return { message: 'Exercise removed successfully' };
  }
}
