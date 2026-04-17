import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PostsService } from './posts.service';

type CreatePostRequest = {
  title?: string;
  content?: string;
  thumbnailUrl?: string | null;
};

type UpdatePostRequest = {
  title?: string;
  content?: string;
  thumbnailUrl?: string | null;
};

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.postsService.list(this.parsePositiveInteger(page, 1), this.parsePositiveInteger(limit, 10));
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    return this.postsService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(@Body() body: CreatePostRequest) {
    return this.postsService.create({
      title: body.title ?? '',
      content: body.content ?? '',
      thumbnailUrl: body.thumbnailUrl ?? null
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePostRequest) {
    return this.postsService.update(id, {
      title: body.title,
      content: body.content,
      thumbnailUrl: body.thumbnailUrl
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(204)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.postsService.delete(id);
  }

  private parsePositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
