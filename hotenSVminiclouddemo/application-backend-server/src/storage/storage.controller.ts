import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { StorageService } from './storage.service';

@Controller()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('upload-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getUploadUrl(@Query('filename') filename?: string, @Query('contentType') contentType?: string) {
    const safeFilename = filename?.trim();
    const safeContentType = contentType?.trim();

    if (!safeFilename || !safeContentType) {
      throw new BadRequestException('filename and contentType are required');
    }

    return this.storageService.createUploadUrl(safeFilename, safeContentType);
  }
}
