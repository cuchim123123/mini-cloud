import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { KeycloakJwtService } from './keycloak-jwt.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: KeycloakJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, string | string[] | undefined>; user?: unknown }>();
    const authorizationHeader = request.headers?.authorization ?? request.headers?.Authorization;
    const authorization = Array.isArray(authorizationHeader) ? authorizationHeader[0] : String(authorizationHeader ?? '');
    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const payload = await this.jwtService.verifyBearerToken(token);
    request.user = payload;
    return true;
  }
}
