import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostgresService } from './postgres.service';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';

@Module({
  imports: [],
  controllers: [AppController, PlatformController],
  providers: [AppService, PostgresService, PlatformService]
})
export class AppModule {}
