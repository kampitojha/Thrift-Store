import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
      const agg = await this.prisma.review.aggregate({
        where: { targetUserId: data.targetUserId, status: 'published' },
        _avg: { rating: true },
        _count: true,
      });
      await this.prisma.userProfile.updateMany({
        where: { userId: data.targetUserId },
        data: {
          averageRating: agg._avg.rating ?? 0,
          totalReviews: agg._count,
        },
      });
    }

    return review;
  }

  async forProduct(productId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { productId, status: 'published' };
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

  async markHelpful(reviewId: string) {
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
    });
  }
}
