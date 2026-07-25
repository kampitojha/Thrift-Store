import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/utils/slug';

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  async createStore(
    userId: string,
    data: { storeName: string; storeDescription?: string; businessType?: string },
  ) {
    const existing = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Seller profile already exists');

    const storeSlug = slugify(data.storeName) + '-' + Math.random().toString(36).slice(2, 6);

    const [profile] = await this.prisma.$transaction([
      this.prisma.sellerProfile.create({
        data: {
          userId,
          storeName: data.storeName,
          storeSlug,
          storeDescription: data.storeDescription,
          businessType: data.businessType || 'individual',
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { role: 'SELLER' },
      }),
    ]);

    return profile;
  }

  async getStore(slug: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { storeSlug: slug },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            isVerified: true,
            city: true,
            country: true,
            createdAt: true,
            profile: true,
            _count: { select: { products: true, followers: true } },
          },
        },
      },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async dashboard(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Not a seller');

    const [orders, products, wallet, recentOrders] = await Promise.all([
      this.prisma.orderItem.groupBy({
        by: ['status'],
        where: { sellerId: userId },
        _count: true,
        _sum: { totalPaise: true, sellerEarningPaise: true },
      }),
      this.prisma.product.groupBy({
        by: ['status'],
        where: { sellerId: userId, deletedAt: null },
        _count: true,
      }),
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.prisma.order.findMany({
        where: { items: { some: { sellerId: userId } } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { where: { sellerId: userId } },
          buyer: { select: { username: true, avatarUrl: true } },
        },
      }),
    ]);

    const views = await this.prisma.productView.count({
      where: { product: { sellerId: userId }, createdAt: { gte: new Date(Date.now() - 30 * 864e5) } },
    });

    return {
      store: seller,
      wallet: wallet
        ? {
            balancePaise: wallet.balancePaise.toString(),
            heldPaise: wallet.heldPaise.toString(),
          }
        : null,
      ordersByStatus: orders,
      productsByStatus: products,
      viewsLast30d: views,
      recentOrders,
      revenuePaise: seller.totalRevenuePaise.toString(),
      totalSales: seller.totalSales,
      rating: seller.rating,
    };
  }

  async submitVerification(
    userId: string,
    type: string,
    documentUrl: string,
    documentMeta?: object,
  ) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile required');

    await this.prisma.sellerProfile.update({
      where: { id: seller.id },
      data: { verificationStatus: 'PENDING' },
    });

    return this.prisma.sellerVerification.create({
      data: {
        sellerProfileId: seller.id,
        type,
        documentUrl,
        documentMeta: documentMeta as object,
        status: 'PENDING',
      },
    });
  }
}
