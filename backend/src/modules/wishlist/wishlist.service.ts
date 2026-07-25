import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page = 1, limit = 24) {
    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.wishlistItem.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              pricePaise: true,
              originalPricePaise: true,
              status: true,
              condition: true,
              media: { where: { isPrimary: true }, take: 1, select: { url: true } },
              seller: { select: { id: true, username: true, isVerified: true } },
            },
          },
        },
      }),
      this.prisma.wishlistItem.count({ where: { userId } }),
    ]);

    return {
      data: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        createdAt: i.createdAt,
        product: {
          ...i.product,
          thumbnailUrl: i.product.media[0]?.url ?? null,
        },
      })),
      meta: paginationMeta(total, page, take),
    };
  }

  async toggle(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.wishlistItem.delete({ where: { id: existing.id } }),
        this.prisma.product.update({
          where: { id: productId },
          data: { favoriteCount: { decrement: 1 } },
        }),
      ]);
      return { wishlisted: false };
    }

    await this.prisma.$transaction([
      this.prisma.wishlistItem.create({ data: { userId, productId } }),
      this.prisma.product.update({
        where: { id: productId },
        data: { favoriteCount: { increment: 1 } },
      }),
    ]);
    return { wishlisted: true };
  }
}
