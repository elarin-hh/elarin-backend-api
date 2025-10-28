import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Delete, Get, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RegisterWithOrganizationDto } from './dto';
import { UpdateConsentDto } from '../users/dto/consent.dto';
import { UserProfileService } from './user-profile.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userProfileService: UserProfileService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('register-with-organization')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user with organization' })
  @ApiResponse({ status: 201, description: 'User registered and linked to organization successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async registerWithOrganization(@Body() registerDto: RegisterWithOrganizationDto) {
    return this.authService.registerWithOrganization(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user account permanently' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@Req() request: any) {
    const user = request.user;
    return this.authService.deleteAccount(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('consent')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update user consent (LGPD Art. 8º)',
    description: 'Atualizar consentimentos: general (Termos+Privacidade), biometric (Dados Biométricos), marketing'
  })
  @ApiResponse({ status: 200, description: 'Consent updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid consent type' })
  async updateConsent(@Req() request: any, @Body() updateConsentDto: UpdateConsentDto) {
    const user = request.user;
    return this.userProfileService.updateConsent(user.id, updateConsentDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/export')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Export user data (LGPD Art. 18, V - Portabilidade)',
    description: 'Exportar todos os dados pessoais e de treino em formato JSON estruturado'
  })
  @ApiResponse({ status: 200, description: 'User data exported successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportUserData(@Req() request: any) {
    const user = request.user;
    return this.userProfileService.exportUserData(user.id);
  }
}
