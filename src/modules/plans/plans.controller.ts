import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active plans' })
  @ApiResponse({ status: 200, description: 'List of active plans retrieved' })
  async getAllActivePlans() {
    return this.plansService.getAllActivePlans();
  }
}
