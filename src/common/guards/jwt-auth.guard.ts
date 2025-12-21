import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../modules/auth/auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_ORGANIZATION_ROUTE_KEY } from '../decorators/organization-route.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if route is for organization (uses OrganizationAuthGuard instead)
    const isOrganizationRoute = this.reflector.getAllAndOverride<boolean>(IS_ORGANIZATION_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isOrganizationRoute) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    try {
      const user = await this.authService.verifyToken(token);
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: any): string | undefined {
    const fromHeader = this.extractTokenFromHeader(request);
    if (fromHeader) return fromHeader;

    return this.extractTokenFromCookies(request);
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromCookies(request: any): string | undefined {
    const cookies = request?.cookies || this.parseCookieHeader(request?.headers?.cookie);
    if (!cookies) return undefined;
    return cookies['access_token'];
  }

  private parseCookieHeader(cookieHeader?: string): Record<string, string> | undefined {
    if (!cookieHeader) return undefined;
    return cookieHeader.split(';').reduce((acc: Record<string, string>, part: string) => {
      const [key, ...value] = part.trim().split('=');
      if (key) {
        acc[key] = decodeURIComponent(value.join('='));
      }
      return acc;
    }, {});
  }
}
