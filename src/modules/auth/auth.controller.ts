import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Delete, Get, Patch, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RegisterWithOrganizationDto } from './dto';
import { UpdateConsentDto } from '../users/dto/consent.dto';
import { UserProfileService } from './user-profile.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import type { FastifyReply } from 'fastify';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userProfileService: UserProfileService,
  ) { }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.register(registerDto);
    this.setAuthCookies(reply, result.session);
    return result;
  }

  @Public()
  @Post('register-with-organization')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user with organization' })
  @ApiResponse({ status: 201, description: 'User registered and linked to organization successfully' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  async registerWithOrganization(@Body() registerDto: RegisterWithOrganizationDto, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.registerWithOrganization(registerDto);
    this.setAuthCookies(reply, result.session);
    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.login(loginDto);
    this.setAuthCookies(reply, result.session);
    return result;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear auth cookies' })
  async logout(@Res({ passthrough: true }) reply: FastifyReply) {
    this.clearAuthCookies(reply);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user (cookie-based auth)' })
  @ApiResponse({ status: 200, description: 'Authenticated user returned' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async me(@Req() request: any) {
    return { user: request.user };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user account permanently' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
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
  })
  @ApiResponse({ status: 200, description: 'Consent updated successfully' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 400, description: 'Tipo de consentimento inválido' })
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
  })
  @ApiResponse({ status: 200, description: 'User data exported successfully' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async exportUserData(@Req() request: any) {
    const user = request.user;
    return this.userProfileService.exportUserData(user.id);
  }

  private setAuthCookies(reply: FastifyReply, session: any) {
    if (!session) return;

    const isProd = process.env.NODE_ENV === 'production';
    const access = session.access_token;
    const refresh = session.refresh_token;
    const accessMaxAge = session.expires_in ? Number(session.expires_in) : 3600;
    const refreshMaxAge = 60 * 60 * 24 * 7;

    const cookieBase = `Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;

    const cookies: string[] = [];
    if (access) {
      cookies.push(`access_token=${access}; Max-Age=${accessMaxAge}; ${cookieBase}`);
    }
    if (refresh) {
      cookies.push(`refresh_token=${refresh}; Max-Age=${refreshMaxAge}; ${cookieBase}`);
    }

    if (cookies.length) {
      reply.header('Set-Cookie', cookies);
    }
  }

  private clearAuthCookies(reply: FastifyReply) {
    const base = 'Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    reply.header('Set-Cookie', [
      `access_token=; ${base}${secure}`,
      `refresh_token=; ${base}${secure}`,
    ]);
  }
}
