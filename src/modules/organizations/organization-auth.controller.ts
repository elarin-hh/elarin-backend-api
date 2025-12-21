import { Controller, Post, Body, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrganizationAuthService } from './organization-auth.service';
import { RegisterOrganizationDto, LoginOrganizationDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';
import type { FastifyReply } from 'fastify';

@ApiTags('Organization Authentication')
@Controller('organizations/auth')
export class OrganizationAuthController {
  constructor(private readonly organizationAuthService: OrganizationAuthService) { }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new organization' })
  @ApiResponse({ status: 201, description: 'Organization registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() registerOrganizationDto: RegisterOrganizationDto, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.organizationAuthService.register(registerOrganizationDto);
    this.setAuthCookies(reply, result.session);
    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Organization login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginOrganizationDto: LoginOrganizationDto, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.organizationAuthService.login(loginOrganizationDto);
    this.setAuthCookies(reply, result.session);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Organization logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Res({ passthrough: true }) reply: FastifyReply) {
    this.clearAuthCookies(reply);
    return { success: true };
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
      cookies.push(`org_access_token=${access}; Max-Age=${accessMaxAge}; ${cookieBase}`);
    }
    if (refresh) {
      cookies.push(`org_refresh_token=${refresh}; Max-Age=${refreshMaxAge}; ${cookieBase}`);
    }

    if (cookies.length) {
      reply.header('Set-Cookie', cookies);
    }
  }

  private clearAuthCookies(reply: FastifyReply) {
    const base = 'Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    reply.header('Set-Cookie', [
      `org_access_token=; ${base}${secure}`,
      `org_refresh_token=; ${base}${secure}`,
    ]);
  }
}
