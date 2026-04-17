import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import { AuthModuleOptions, JwtClaims, KEYCLOAK_AUTH_OPTIONS } from './auth.constants';
import { ROLES_KEY } from './roles.decorator';
import { KeycloakJwtService } from './keycloak-jwt.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: KeycloakJwtService,
    @Inject(KEYCLOAK_AUTH_OPTIONS) private readonly authOptions: AuthModuleOptions
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

    const normalizedRequiredRoles = this.expandConfiguredRoles(requiredRoles);
    const allowed = this.jwtService.hasAnyRole(user, normalizedRequiredRoles);
    if (!allowed) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }

  private expandConfiguredRoles(requiredRoles: string[]): string[] {
    const configuredAdminRole = this.authOptions.adminRole?.trim();
    return requiredRoles.flatMap((role) => {
      if (role === 'admin' && configuredAdminRole && configuredAdminRole !== 'admin') {
        return ['admin', configuredAdminRole];
      }
      return [role];
    });
  }
}
