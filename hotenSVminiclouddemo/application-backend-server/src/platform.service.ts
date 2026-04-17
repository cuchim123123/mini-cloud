import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PostgresService } from './postgres.service';

type DependencyCheck = {
  name: string;
  status: 'up' | 'down';
  latencyMs: number;
  details?: string;
};

type PlatformSummary = {
  generatedAt: string;
  overallStatus: 'healthy' | 'degraded';
  dependencies: DependencyCheck[];
  data: {
    notesCount: number;
    studentsCount: number;
    keycloakUsers: number;
  };
};

type SafeValue<T> = {
  value: T;
  error?: string;
};

@Injectable()
export class PlatformService {
  private readonly requestTimeoutMs = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 2500);
  private readonly keycloakBaseUrl = process.env.KEYCLOAK_INTERNAL_URL ?? 'http://authentication-identity-server:8080';
  private readonly minioBaseUrl = process.env.MINIO_INTERNAL_URL ?? 'http://object-storage-server:9000';
  private readonly prometheusBaseUrl = process.env.PROMETHEUS_INTERNAL_URL ?? 'http://monitoring-prometheus-server:9090';
  private readonly grafanaBaseUrl = process.env.GRAFANA_INTERNAL_URL ?? 'http://monitoring-grafana-dashboard-server:3000';
  private readonly keycloakAdminUser = process.env.KEYCLOAK_ADMIN_USER ?? 'admin';
  private readonly keycloakAdminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';
  private readonly keycloakRealm = process.env.KEYCLOAK_REALM ?? 'realm_sv001';
  private readonly studentDatabaseUrl = this.resolveStudentDatabaseUrl();

  constructor(private readonly postgresService: PostgresService) {}

  async getPlatformSummary(): Promise<PlatformSummary> {
    const [keycloakCheck, minioCheck, prometheusCheck, grafanaCheck] = await Promise.all([
      this.checkHttpDependency('keycloak', `${this.keycloakBaseUrl}/realms/${this.keycloakRealm}/.well-known/openid-configuration`),
      this.checkHttpDependency('minio', `${this.minioBaseUrl}/minio/health/live`),
      this.checkHttpDependency('prometheus', `${this.prometheusBaseUrl}/-/healthy`),
      this.checkHttpDependency('grafana', `${this.grafanaBaseUrl}/api/health`)
    ]);

    const [notesResult, studentsResult, keycloakUsersResult] = await Promise.all([
      this.safeValue(() => this.getNotesCount(), 0),
      this.safeValue(() => this.getStudentsCount(), 0),
      this.safeValue(() => this.getKeycloakUsersCount(), 0)
    ]);

    const postgresDetails = notesResult.error || studentsResult.error
      ? `query failure: ${notesResult.error ?? studentsResult.error}`
      : 'reachable via pooled connection';

    const dependencies = [
      {
        name: 'postgres',
        status: notesResult.error || studentsResult.error ? 'down' : 'up',
        latencyMs: 0,
        details: postgresDetails
      } as DependencyCheck,
      keycloakCheck,
      minioCheck,
      prometheusCheck,
      grafanaCheck
    ];

    const overallStatus = dependencies.every((dependency) => dependency.status === 'up') ? 'healthy' : 'degraded';

    return {
      generatedAt: new Date().toISOString(),
      overallStatus,
      dependencies,
      data: {
        notesCount: notesResult.value,
        studentsCount: studentsResult.value,
        keycloakUsers: keycloakUsersResult.value
      }
    };
  }

  private async safeValue<T>(executor: () => Promise<T>, fallback: T): Promise<SafeValue<T>> {
    try {
      const value = await executor();
      return { value };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      return {
        value: fallback,
        error: message
      };
    }
  }

  private async checkHttpDependency(name: string, url: string): Promise<DependencyCheck> {
    const startedAt = Date.now();
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(this.requestTimeoutMs)
      });

      return {
        name,
        status: response.ok ? 'up' : 'down',
        latencyMs: Date.now() - startedAt,
        details: `http ${response.status}`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      return {
        name,
        status: 'down',
        latencyMs: Date.now() - startedAt,
        details: message
      };
    }
  }

  private async getNotesCount(): Promise<number> {
    const rows = await this.postgresService.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM notes');
    return Number(rows[0]?.count ?? 0);
  }

  private async getStudentsCount(): Promise<number> {
    const pool = new Pool({ connectionString: this.studentDatabaseUrl });
    try {
      const result = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM students');
      return Number(result.rows[0]?.count ?? 0);
    } finally {
      await pool.end();
    }
  }

  private resolveStudentDatabaseUrl(): string {
    const explicitUrl = process.env.STUDENT_DATABASE_URL;
    if (explicitUrl) {
      return explicitUrl;
    }

    const defaultBase = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@relational-database-server:5432/minicloud';
    const parsedUrl = new URL(defaultBase);
    parsedUrl.pathname = '/studentdb';
    return parsedUrl.toString();
  }

  private async getKeycloakUsersCount(): Promise<number> {
    try {
      const tokenResponse = await fetch(`${this.keycloakBaseUrl}/realms/master/protocol/openid-connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: this.keycloakAdminUser,
          password: this.keycloakAdminPassword
        }),
        signal: AbortSignal.timeout(this.requestTimeoutMs)
      });

      if (!tokenResponse.ok) {
        return 0;
      }

      const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
      if (!tokenPayload.access_token) {
        return 0;
      }

      const usersResponse = await fetch(
        `${this.keycloakBaseUrl}/admin/realms/${this.keycloakRealm}/users?max=200`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenPayload.access_token}`
          },
          signal: AbortSignal.timeout(this.requestTimeoutMs)
        }
      );

      if (!usersResponse.ok) {
        return 0;
      }

      const users = (await usersResponse.json()) as unknown[];
      return users.length;
    } catch {
      return 0;
    }
  }
}
