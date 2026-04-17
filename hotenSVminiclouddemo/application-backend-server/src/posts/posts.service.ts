import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PostgresService } from '../postgres.service';

export type PostEntity = {
  id: number;
  title: string;
  slug: string;
  content: string;
  thumbnail_url: string | null;
  created_at: Date;
  updated_at: Date;
};

export type PostResponse = {
  id: number;
  title: string;
  slug: string;
  content: string;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PostsPage = {
  data: PostResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class PostsService implements OnModuleInit {
  constructor(private readonly postgresService: PostgresService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
  }

  async list(page: number, limit: number): Promise<PostsPage> {
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
    const offset = (safePage - 1) * safeLimit;

    const [items, totalRows] = await Promise.all([
      this.postgresService.query<PostEntity>(
        `SELECT id, title, slug, content, thumbnail_url, created_at, updated_at
         FROM posts
         ORDER BY created_at DESC, id DESC
         LIMIT $1 OFFSET $2`,
        [safeLimit, offset]
      ),
      this.postgresService.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM posts')
    ]);

    const total = Number(totalRows[0]?.count ?? 0);
    return {
      data: items.map((item) => this.toResponse(item)),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit)
      }
    };
  }

  async findBySlug(slug: string): Promise<PostResponse> {
    const rows = await this.postgresService.query<PostEntity>(
      `SELECT id, title, slug, content, thumbnail_url, created_at, updated_at
       FROM posts
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );

    const post = rows[0];
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.toResponse(post);
  }

  async create(input: { title: string; content: string; thumbnailUrl?: string | null }): Promise<PostResponse> {
    const title = input.title.trim();
    const content = input.content.trim();
    if (!title || !content) {
      throw new BadRequestException('Title and content are required');
    }

    const slug = await this.generateUniqueSlug(title);
    const rows = await this.postgresService.query<PostEntity>(
      `INSERT INTO posts (title, slug, content, thumbnail_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, slug, content, thumbnail_url, created_at, updated_at`,
      [title, slug, content, input.thumbnailUrl ?? null]
    );

    return this.toResponse(rows[0]);
  }

  async update(
    id: number,
    input: { title?: string; content?: string; thumbnailUrl?: string | null }
  ): Promise<PostResponse> {
    const existingRows = await this.postgresService.query<PostEntity>(
      `SELECT id, title, slug, content, thumbnail_url, created_at, updated_at
       FROM posts
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    const existing = existingRows[0];
    if (!existing) {
      throw new NotFoundException('Post not found');
    }

    const nextTitle = input.title?.trim() || existing.title;
    const nextContent = input.content?.trim() || existing.content;
    const nextThumbnailUrl = input.thumbnailUrl !== undefined ? input.thumbnailUrl : existing.thumbnail_url;
    const nextSlug = nextTitle === existing.title ? existing.slug : await this.generateUniqueSlug(nextTitle, id);

    const rows = await this.postgresService.query<PostEntity>(
      `UPDATE posts
       SET title = $1,
           slug = $2,
           content = $3,
           thumbnail_url = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, title, slug, content, thumbnail_url, created_at, updated_at`,
      [nextTitle, nextSlug, nextContent, nextThumbnailUrl ?? null, id]
    );

    return this.toResponse(rows[0]);
  }

  async delete(id: number): Promise<void> {
    const rows = await this.postgresService.query<{ id: number }>('DELETE FROM posts WHERE id = $1 RETURNING id', [id]);
    if (!rows[0]) {
      throw new NotFoundException('Post not found');
    }
  }

  private async ensureSchema(): Promise<void> {
    await this.postgresService.query(
      `CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        thumbnail_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    );

    await this.postgresService.query(`CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_unique_idx ON posts (slug)`);

    await this.postgresService.query(
      `CREATE OR REPLACE FUNCTION set_posts_updated_at()
       RETURNS trigger
       LANGUAGE plpgsql
       AS $$
       BEGIN
         NEW.updated_at = CURRENT_TIMESTAMP;
         RETURN NEW;
       END;
       $$`
    );

    await this.postgresService.query('DROP TRIGGER IF EXISTS posts_updated_at_trigger ON posts');
    await this.postgresService.query(
      `CREATE TRIGGER posts_updated_at_trigger
       BEFORE UPDATE ON posts
       FOR EACH ROW
       EXECUTE FUNCTION set_posts_updated_at()`
    );
  }

  private async generateUniqueSlug(title: string, excludeId?: number): Promise<string> {
    const baseSlug = this.slugify(title);
    const rows = await this.postgresService.query<{ slug: string }>(
      excludeId
        ? `SELECT slug FROM posts WHERE (slug = $1 OR slug LIKE $2) AND id <> $3`
        : `SELECT slug FROM posts WHERE slug = $1 OR slug LIKE $2`,
      excludeId ? [baseSlug, `${baseSlug}-%`, excludeId] : [baseSlug, `${baseSlug}-%`]
    );

    if (rows.length === 0) {
      return baseSlug;
    }

    const suffixNumbers = rows
      .map((row) => {
        if (row.slug === baseSlug) {
          return 0;
        }

        const match = row.slug.match(new RegExp(`^${this.escapeRegExp(baseSlug)}-(\\d+)$`));
        return match ? Number(match[1]) : -1;
      })
      .filter((value) => value >= 0);

    const nextSuffix = suffixNumbers.length === 0 ? 1 : Math.max(...suffixNumbers) + 1;
    return `${baseSlug}-${nextSuffix}`;
  }

  private slugify(value: string): string {
    const normalized = value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || 'post';
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private toResponse(entity: PostEntity): PostResponse {
    return {
      id: entity.id,
      title: entity.title,
      slug: entity.slug,
      content: entity.content,
      thumbnailUrl: entity.thumbnail_url,
      createdAt: entity.created_at.toISOString(),
      updatedAt: entity.updated_at.toISOString()
    };
  }
}
