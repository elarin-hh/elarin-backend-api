import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GymAuthService } from '../gym-auth.service';

@Injectable()
export class GymAuthGuard implements CanActivate {
  constructor(
    private readonly gymAuthService: GymAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar se a rota é pública
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

    const token = authHeader.substring(7); // Remove 'Bearer '

    try {
      const gym = await this.gymAuthService.verifyToken(token);
      request.gym = gym; // Anexa a academia ao request
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
