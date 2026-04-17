import { DynamicModule, Global, Module } from '@nestjs/common';
import { STORAGE_MODULE_OPTIONS, StorageModuleOptions } from './storage.constants';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Global()
@Module({
  controllers: [StorageController],
  providers: [StorageService]
})
export class StorageModule {}

export namespace StorageModule {
  export function register(options: StorageModuleOptions): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        {
          provide: STORAGE_MODULE_OPTIONS,
          useValue: options
        },
        StorageService
      ],
      exports: [STORAGE_MODULE_OPTIONS, StorageService]
    };
  }
}
