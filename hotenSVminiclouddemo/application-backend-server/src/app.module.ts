import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostgresService } from './postgres.service';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    DatabaseModule.register({
      connectionString: process.env.DATABASE_URL || (() => {
        throw new Error('DATABASE_URL environment variable is required');
      })()
    }),
    AuthModule.register({
      issuerUrl: process.env.KEYCLOAK_ISSUER_URL || (() => {
        throw new Error('KEYCLOAK_ISSUER_URL environment variable is required');
      })(),
      audience: process.env.OIDC_AUDIENCE || 'myapp',
      adminRole: process.env.KEYCLOAK_ADMIN_ROLE || 'admin',
      requestTimeoutMs: Number(process.env.KEYCLOAK_REQUEST_TIMEOUT_MS ?? 2500)
    }),
    StorageModule.register({
      publicBaseUrl: process.env.MINIO_PUBLIC_BASE_URL || 'http://localhost/storage',
      accessKey: process.env.MINIO_ACCESS_KEY || (() => {
        throw new Error('MINIO_ACCESS_KEY environment variable is required');
      })(),
      secretKey: process.env.MINIO_SECRET_KEY || (() => {
        throw new Error('MINIO_SECRET_KEY environment variable is required');
      })(),
      bucketName: process.env.MINIO_BUCKET_NAME || 'documents',
      objectPrefix: process.env.MINIO_OBJECT_PREFIX || 'blog',
      region: process.env.MINIO_REGION || 'us-east-1'
    }),
    PostsModule
  ],
  controllers: [AppController, PlatformController],
  providers: [AppService, PostgresService, PlatformService]
})
export class AppModule {}
