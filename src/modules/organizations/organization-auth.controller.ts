import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrganizationAuthService } from './organization-auth.service';
import { RegisterOrganizationDto, LoginOrganizationDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Organization Authentication')
@Controller('organizations/auth')
export class OrganizationAuthController {
  constructor(private readonly organizationAuthService: OrganizationAuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new organization' })
  @ApiResponse({ status: 201, description: 'Organization registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() registerOrganizationDto: RegisterOrganizationDto) {
    return this.organizationAuthService.register(registerOrganizationDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Organization login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginOrganizationDto: LoginOrganizationDto) {
    return this.organizationAuthService.login(loginOrganizationDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Organization logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout() {
    return this.organizationAuthService.logout();
  }
}
