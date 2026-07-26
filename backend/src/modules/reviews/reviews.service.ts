import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    authorId: string,
    data: {
      productId?: string;
      targetUserId?: string;
      orderId?: string;
      rating: number;
      title?: string;
      body?: string;
      mediaUrls?: string[];
    },
  ) {
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Rating must be 1-5');
    }

    if (data.productId) {
      const existing = await this.prisma.review.findFirst({
        where: {
          authorId,
          productId: data.productId,
          deletedAt: null,
        },
      });
      if (existing) {
        throw new ConflictException('You have already reviewed this product');
      }
    }

    let isVerifiedPurchase = false;
    if (data.orderId) {
      const order = await this.prisma.order.findFirst({
        where: { id: data.orderId, buyerId: authorId, status: 'DELIVERED' },
      });
      isVerifiedPurchase = Boolean(order);
    }

    const review = await this.prisma.review.create({
      data: {
        authorId,
        productId: data.productId,
        targetUserId: data.targetUserId,
        orderId: data.orderId,
        rating: data.rating,
        title: data.title,
        body: data.body,
        mediaUrls: data.mediaUrls ?? [],
        isVerifiedPurchase,
      },
    });

    if (data.targetUserId) {
      await this.recalcTargetRating(data.targetUserId);
    }

    return review;
  }

  async forProduct(productId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { productId, status: 'published' as const, deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, avatarUrl: true, isVerified: true },
          },
          replies: {
            where: { deletedAt: null },
            include: {
              author: {
                select: { id: true, username: true, avatarUrl: true, displayName: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async forSeller(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { targetUserId: userId, status: 'published' as const, deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, avatarUrl: true, isVerified: true },
          },
          product: {
            select: { id: true, title: true, slug: true },
          },
          replies: {
            where: { deletedAt: null },
            include: {
              author: {
                select: { id: true, username: true, avatarUrl: true, displayName: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    const agg = await this.prisma.review.aggregate({
      where: { targetUserId: userId, status: 'published', deletedAt: null },
      _avg: { rating: true },
      _count: true,
    });

    return {
      data: items,
      meta: {
        ...paginationMeta(total, page, take),
        averageRating: agg._avg.rating ?? 0,
        totalReviews: agg._count,
      },
    };
  }

  async filterByRating(productId: string, rating: number, page = 1, limit = 20) {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be 1-5');
    }
    const { skip, take } = paginate(page, limit);
    const where = { productId, status: 'published' as const, deletedAt: null, rating };
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, avatarUrl: true, isVerified: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async reply(authorId: string, reviewId: string, body: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { targetUserId: true, deletedAt: true },
    });
    if (!review || review.deletedAt) throw new NotFoundException('Review not found');
    if (review.targetUserId !== authorId) {
      throw new ForbiddenException('You can only reply to reviews on your profile');
    }

    return this.prisma.review.create({
      data: {
        authorId,
        targetUserId: review.targetUserId,
        replyToId: reviewId,
        body,
        rating: 5,
        isVerifiedPurchase: false,
      },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true, displayName: true },
        },
      },
    });
  }

  async markHelpful(reviewId: string, userId?: string) {
    if (userId) {
      const review = await this.prisma.review.findUnique({
        where: { id: reviewId },
        select: { id: true },
      });
      if (!review) throw new NotFoundException('Review not found');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
    });
  }

  async delete(authorId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { authorId: true, targetUserId: true, deletedAt: true },
    });
    if (!review || review.deletedAt) throw new NotFoundException('Review not found');
    if (review.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.update({
      where: { id: reviewId },
      data: { deletedAt: new Date(), status: 'archived' },
    });

    if (review.targetUserId) {
      await this.recalcTargetRating(review.targetUserId);
    }

    return { ok: true };
  }

  private async recalcTargetRating(targetUserId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { targetUserId, status: 'published', deletedAt: null },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.userProfile.updateMany({
      where: { userId: targetUserId },
      data: {
        averageRating: agg._avg.rating ?? 0,
        totalReviews: agg._count,
      },
    });
  }
}
