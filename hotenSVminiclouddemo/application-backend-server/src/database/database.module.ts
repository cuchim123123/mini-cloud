import { DynamicModule, Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL, DatabaseModuleOptions } from './database.constants';
import { PostgresService } from '../postgres.service';

@Global()
@Module({})
export class DatabaseModule {
  static register(options: DatabaseModuleOptions): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE_POOL,
          useFactory: () => new Pool({ connectionString: options.connectionString })
        },
        PostgresService
      ],
      exports: [DATABASE_POOL, PostgresService]
    };
  }
}
