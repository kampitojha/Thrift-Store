import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../config/redis.module';

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async home() {
    const cached = await this.redis.get('cms:home');
    if (cached) return cached;

    const [banners, categories, featured, trending] = await Promise.all([
      this.prisma.banner.findMany({
        where: { isActive: true, placement: 'home_hero' },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.category.findMany({
        where: { parentId: null, isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 12,
      }),
      this.prisma.product.findMany({
        where: { status: 'ACTIVE', deletedAt: null, isFeatured: true },
        take: 12,
        orderBy: { publishedAt: 'desc' },
        include: {
          media: { where: { isPrimary: true }, take: 1 },
          brand: true,
          seller: { select: { id: true, username: true, isVerified: true, avatarUrl: true } },
        },
      }),
      this.prisma.product.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        take: 16,
        orderBy: { viewCount: 'desc' },
        include: {
          media: { where: { isPrimary: true }, take: 1 },
          brand: true,
          seller: { select: { id: true, username: true, isVerified: true, avatarUrl: true } },
        },
      }),
    ]);

    const payload = { banners, categories, featured, trending };
    await this.redis.set('cms:home', payload, 60);
    return payload;
  }

  async page(slug: string) {
    const page = await this.prisma.staticPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async faqs() {
    return this.prisma.faq.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async blogs(page = 1, limit = 12) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where: { status: 'published' },
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.blogPost.count({ where: { status: 'published' } }),
    ]);
    return { data: items, meta: { page, limit, total } };
  }
}
