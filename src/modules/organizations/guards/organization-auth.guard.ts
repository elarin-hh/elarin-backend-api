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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7);

    try {
      const organization = await this.organizationAuthService.verifyToken(token);
      request.organization = organization;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
