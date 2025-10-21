import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GymAuthService } from './gym-auth.service';
import { RegisterGymDto, LoginGymDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Gym Authentication')
@Controller('gyms/auth')
export class GymAuthController {
  constructor(private readonly gymAuthService: GymAuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new gym' })
  @ApiResponse({ status: 201, description: 'Gym registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() registerGymDto: RegisterGymDto) {
    return this.gymAuthService.register(registerGymDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gym login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginGymDto: LoginGymDto) {
    return this.gymAuthService.login(loginGymDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gym logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout() {
    return this.gymAuthService.logout();
  }
}
