import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtClaims } from './auth.constants';
import { ROLES_KEY } from './roles.decorator';
import { KeycloakJwtService } from './keycloak-jwt.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: KeycloakJwtService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtClaims } & { headers?: Record<string, string> }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Missing authenticated user');
    }

    const roles = this.jwtService.getRoles(user);
    const allowed = requiredRoles.every((role) => roles.includes(role));
    if (!allowed) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
