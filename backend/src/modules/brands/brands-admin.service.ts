import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class BrandsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 24, opts?: { q?: string; isActive?: boolean }) {
    const p = paginate(page, limit);
    const where: any = {};
    if (opts?.q) {
      where.OR = [
        { name: { contains: opts.q, mode: 'insensitive' } },
        { slug: { contains: opts.q, mode: 'insensitive' } },
      ];
    }
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;
    const [items, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: p.skip,
        take: p.take,
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.brand.count({ where }),
    ]);
    return {
      items: items.map((b) => ({ ...b, productCount: b._count.products, _count: undefined })),
      meta: paginationMeta(total, p.page, p.limit),
    };
  }

  async get(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return { ...brand, productCount: brand._count.products, _count: undefined };
  }

  async create(data: { name: string; slug?: string; logoUrl?: string; isLuxury?: boolean; isActive?: boolean }) {
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const existing = await this.prisma.brand.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Brand with this slug already exists');
    return this.prisma.brand.create({ data: { ...data, slug } });
  }

  async update(id: string, data: Record<string, any>) {
    await this.get(id);
    if (data.name && !data.slug) {
      data.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    if (data.slug) {
      const existing = await this.prisma.brand.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (existing) throw new ConflictException('Brand with this slug already exists');
    }
    return this.prisma.brand.update({ where: { id }, data });
  }

  async delete(id: string) {
    const brand = await this.get(id);
    if ((brand as any).productCount > 0) {
      throw new ConflictException('Cannot delete brand with existing products');
    }
    await this.prisma.brand.delete({ where: { id } });
  }
}
