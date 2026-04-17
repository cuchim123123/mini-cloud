import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createPublicKey, createVerify, KeyObject } from 'node:crypto';
import { KEYCLOAK_AUTH_OPTIONS, AuthModuleOptions, JwtClaims } from './auth.constants';

type JwkSet = {
  keys: Array<JsonWebKey & { kid?: string }>;
};

@Injectable()
export class KeycloakJwtService {
  private readonly jwksCache = new Map<string, { key: KeyObject; fetchedAt: number }>();
  private readonly jwksCacheTtlMs = 5 * 60 * 1000;

  constructor(@Inject(KEYCLOAK_AUTH_OPTIONS) private readonly options: AuthModuleOptions) {}

  async verifyBearerToken(token: string): Promise<JwtClaims> {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedException('Invalid JWT format');
    }

    const header = this.decodeJson<{ alg?: string; kid?: string }>(encodedHeader);
    if (header.alg !== 'RS256' || !header.kid) {
      throw new UnauthorizedException('Unsupported JWT algorithm');
    }

    const key = await this.getVerificationKey(header.kid);
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();

    const signature = Buffer.from(encodedSignature, 'base64url');
    const verified = verifier.verify(key, signature);
    if (!verified) {
      throw new UnauthorizedException('JWT signature verification failed');
    }

    const payload = this.decodeJson<JwtClaims>(encodedPayload);
    this.assertClaims(payload);
    return payload;
  }

  getRoles(payload: JwtClaims): string[] {
    const realmRoles = payload.realm_access?.roles ?? [];
    const resourceRoles = Object.values(payload.resource_access ?? {})
      .flatMap((entry) => entry.roles ?? []);

    return Array.from(new Set([...realmRoles, ...resourceRoles]));
  }

  hasAnyRole(payload: JwtClaims, requiredRoles: string[]): boolean {
    const normalizedRequired = requiredRoles
      .map((role) => role.trim().toLowerCase())
      .filter((role) => role.length > 0);

    if (normalizedRequired.length === 0) {
      return true;
    }

    const userRoleSet = new Set(this.getRoles(payload).map((role) => role.trim().toLowerCase()));
    return normalizedRequired.every((role) => userRoleSet.has(role));
  }

  private async getVerificationKey(kid: string): Promise<KeyObject> {
    const cached = this.jwksCache.get(kid);
    const now = Date.now();
    if (cached && now - cached.fetchedAt < this.jwksCacheTtlMs) {
      return cached.key;
    }

    const response = await fetch(`${this.options.issuerUrl}/protocol/openid-connect/certs`, {
      signal: AbortSignal.timeout(this.options.requestTimeoutMs ?? 2500)
    });

    if (!response.ok) {
      throw new UnauthorizedException(`Unable to load JWKS: ${response.status}`);
    }

    const jwks = (await response.json()) as JwkSet;
    const jwk = jwks.keys.find((item) => item.kid === kid);
    if (!jwk) {
      throw new UnauthorizedException('JWT key not found');
    }

    const key = createPublicKey({ key: jwk as never, format: 'jwk' });
    this.jwksCache.set(kid, { key, fetchedAt: now });
    return key;
  }

  private assertClaims(payload: JwtClaims): void {
    if (payload.iss !== this.options.issuerUrl) {
      throw new UnauthorizedException('JWT issuer mismatch');
    }

    const expectedAudience = this.options.audience;
    const aud = payload.aud;
    const audienceMatches = Array.isArray(aud) ? aud.includes(expectedAudience) : aud === expectedAudience;
    if (!audienceMatches) {
      throw new UnauthorizedException('JWT audience mismatch');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (typeof payload.nbf === 'number' && payload.nbf > nowSeconds) {
      throw new UnauthorizedException('JWT not active yet');
    }

    if (typeof payload.exp === 'number' && payload.exp <= nowSeconds) {
      throw new UnauthorizedException('JWT expired');
    }
  }

  private decodeJson<T>(encoded: string): T {
    const raw = Buffer.from(encoded, 'base64url').toString('utf8');
    return JSON.parse(raw) as T;
  }
}
