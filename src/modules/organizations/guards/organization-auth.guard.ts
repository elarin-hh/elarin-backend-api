import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationAuthService } from '../organization-auth.service';

@Injectable()
export class OrganizationAuthGuard implements CanActivate {
  constructor(
    private readonly organizationAuthService: OrganizationAuthService,
    private readonly reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token não informado');
    }

    try {
      const organization = await this.organizationAuthService.verifyToken(token);
      request.organization = organization;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
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
    return cookies['org_access_token'];
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
