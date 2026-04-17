export const KEYCLOAK_AUTH_OPTIONS = Symbol('KEYCLOAK_AUTH_OPTIONS');

export type AuthModuleOptions = {
  issuerUrl: string;
  audience: string;
  adminRole: string;
  requestTimeoutMs?: number;
};

export type JwtClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  realm_access?: {
    roles?: string[];
  };
  preferred_username?: string;
  email?: string;
  sub?: string;
  [key: string]: unknown;
};
