import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class CmsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Banners ──────────────────────────────────────────────

  async listBanners(page = 1, limit = 24) {
    const p = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.banner.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.banner.count(),
    ]);
    return { items, meta: paginationMeta(total, p.page, p.limit) };
  }

  async getBanner(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async createBanner(data: {
    title: string;
    subtitle?: string;
    imageUrl: string;
    mobileUrl?: string;
    linkUrl?: string;
    placement?: string;
    sortOrder?: number;
    isActive?: boolean;
    startsAt?: string;
    endsAt?: string;
  }) {
    return this.prisma.banner.create({
      data: {
        ...data,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      },
    });
  }

  async updateBanner(id: string, data: Record<string, any>) {
    await this.getBanner(id);
    if (data.startsAt) data.startsAt = new Date(data.startsAt);
    if (data.endsAt) data.endsAt = new Date(data.endsAt);
    return this.prisma.banner.update({ where: { id }, data });
  }

  async deleteBanner(id: string) {
    await this.getBanner(id);
    await this.prisma.banner.delete({ where: { id } });
  }

  async reorderBanners(ids: string[]) {
    const updates = ids.map((id, i) =>
      this.prisma.banner.update({ where: { id }, data: { sortOrder: i } }),
    );
    await this.prisma.$transaction(updates);
  }

  // ── Blog Posts ───────────────────────────────────────────

  async listBlogs(page = 1, limit = 24, opts?: { status?: string }) {
    const p = paginate(page, limit);
    const where: any = {};
    if (opts?.status) where.status = opts.status;
    const [items, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.blogPost.count({ where }),
    ]);
    return { items, meta: paginationMeta(total, p.page, p.limit) };
  }

  async getBlog(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async createBlog(data: {
    title: string;
    slug?: string;
    excerpt?: string;
    content: string;
    coverUrl?: string;
    authorName?: string;
    status?: string;
    seoTitle?: string;
    seoDesc?: string;
  }) {
    const slug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return this.prisma.blogPost.create({
      data: {
        ...data,
        slug,
        publishedAt: data.status === 'published' ? new Date() : undefined,
      },
    });
  }

  async updateBlog(id: string, data: Record<string, any>) {
    const existing = await this.getBlog(id);
    if (data.status === 'published' && existing.status !== 'published') {
      data.publishedAt = new Date();
    }
    if (data.title && !data.slug) {
      data.slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    return this.prisma.blogPost.update({ where: { id }, data });
  }

  async deleteBlog(id: string) {
    await this.getBlog(id);
    await this.prisma.blogPost.delete({ where: { id } });
  }

  // ── Static Pages ─────────────────────────────────────────

  async listPages(page = 1, limit = 24) {
    const p = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.staticPage.findMany({
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.staticPage.count(),
    ]);
    return { items, meta: paginationMeta(total, p.page, p.limit) };
  }

  async getPage(id: string) {
    const page = await this.prisma.staticPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async createPage(data: {
    slug: string;
    title: string;
    content: string;
    seoTitle?: string;
    seoDesc?: string;
  }) {
    return this.prisma.staticPage.create({ data });
  }

  async updatePage(id: string, data: Record<string, any>) {
    await this.getPage(id);
    return this.prisma.staticPage.update({ where: { id }, data });
  }

  async deletePage(id: string) {
    await this.getPage(id);
    await this.prisma.staticPage.delete({ where: { id } });
  }

  // ── FAQs ─────────────────────────────────────────────────

  async listFaqs(page = 1, limit = 24) {
    const p = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.faq.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.faq.count(),
    ]);
    return { items, meta: paginationMeta(total, p.page, p.limit) };
  }

  async getFaq(id: string) {
    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('FAQ not found');
    return faq;
  }

  async createFaq(data: {
    question: string;
    answer: string;
    category?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return this.prisma.faq.create({ data });
  }

  async updateFaq(id: string, data: Record<string, any>) {
    await this.getFaq(id);
    return this.prisma.faq.update({ where: { id }, data });
  }

  async deleteFaq(id: string) {
    await this.getFaq(id);
    await this.prisma.faq.delete({ where: { id } });
  }

  async reorderFaqs(ids: string[]) {
    const updates = ids.map((id, i) =>
      this.prisma.faq.update({ where: { id }, data: { sortOrder: i } }),
    );
    await this.prisma.$transaction(updates);
  }
}
