import { DynamicModule, Global, Module } from '@nestjs/common';
import { KEYCLOAK_AUTH_OPTIONS, AuthModuleOptions } from './auth.constants';
import { KeycloakJwtService } from './keycloak-jwt.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({})
export class AuthModule {
  static register(options: AuthModuleOptions): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        {
          provide: KEYCLOAK_AUTH_OPTIONS,
          useValue: options
        },
        KeycloakJwtService,
        JwtAuthGuard,
        RolesGuard
      ],
      exports: [KEYCLOAK_AUTH_OPTIONS, KeycloakJwtService, JwtAuthGuard, RolesGuard]
    };
  }
}
