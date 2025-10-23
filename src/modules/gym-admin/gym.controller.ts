import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GymService } from './gym.service';
import { GymAuthService } from './gym-auth.service';
import { GymAuthGuard } from './guards/gym-auth.guard';
import { CurrentGym } from './decorators/current-gym.decorator';
import { GymRoute } from '../../common/decorators/gym-route.decorator';

@ApiTags('Gym Management')
@Controller('gyms')
@UseGuards(GymAuthGuard)
@ApiBearerAuth()
@GymRoute()
export class GymController {
  constructor(
    private readonly gymService: GymService,
    private readonly gymAuthService: GymAuthService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current gym profile' })
  @ApiResponse({ status: 200, description: 'Gym profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentGym('id') gymId: number) {
    return this.gymAuthService.getProfile(gymId);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users linked to gym' })
  @ApiResponse({ status: 200, description: 'Users list retrieved' })
  async getUsers(@CurrentGym('id') gymId: number) {
    return this.gymService.getUsers(gymId);
  }

  @Patch('users/:userId/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle user status (active/inactive)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async toggleUserStatus(
    @CurrentGym('id') gymId: number,
    @Param('userId') userId: string,
  ) {
    return this.gymService.toggleUserStatus(gymId, userId);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove user from gym' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User removed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async removeUser(
    @CurrentGym('id') gymId: number,
    @Param('userId') userId: string,
  ) {
    return this.gymService.removeUser(gymId, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get gym statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats(@CurrentGym('id') gymId: number) {
    return this.gymService.getStats(gymId);
  }
}
