import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/utils/slug';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

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

  async updateStore(
    userId: string,
    data: {
      storeName?: string;
      storeDescription?: string;
      storeLogoUrl?: string;
      storeBannerUrl?: string;
      businessType?: string;
      isVacationMode?: boolean;
      vacationMessage?: string;
      policies?: Record<string, unknown>;
    },
  ) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');

    return this.prisma.sellerProfile.update({
      where: { userId },
      data: {
        storeName: data.storeName,
        storeDescription: data.storeDescription,
        storeLogoUrl: data.storeLogoUrl,
        storeBannerUrl: data.storeBannerUrl,
        businessType: data.businessType,
        isVacationMode: data.isVacationMode,
        vacationMessage: data.vacationMessage,
        policies: data.policies as object,
      },
    });
  }

  async getStoreListings(slug: string, page = 1, limit = 24, status?: string) {
    const store = await this.prisma.sellerProfile.findUnique({ where: { storeSlug: slug } });
    if (!store) throw new NotFoundException('Store not found');

    const { skip, take } = paginate(page, limit);
    const where: Record<string, unknown> = {
      sellerId: store.userId,
      deletedAt: null,
    };
    if (status) where.status = status;
    else where.status = 'ACTIVE';

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: where as never,
        skip,
        take,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          pricePaise: true,
          originalPricePaise: true,
          condition: true,
          status: true,
          city: true,
          favoriteCount: true,
          viewCount: true,
          createdAt: true,
          brand: { select: { name: true } },
          media: { where: { isPrimary: true }, take: 1, select: { url: true, thumbUrl: true } },
          seller: {
            select: { id: true, username: true, avatarUrl: true, isVerified: true, displayName: true },
          },
        },
      }),
      this.prisma.product.count({ where: where as never }),
    ]);

    return {
      data: items.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        pricePaise: p.pricePaise,
        originalPricePaise: p.originalPricePaise,
        condition: p.condition,
        status: p.status,
        city: p.city,
        favoriteCount: p.favoriteCount,
        viewCount: p.viewCount,
        thumbnailUrl: p.media[0]?.url || null,
        brandName: p.brand?.name || null,
        seller: p.seller,
        createdAt: p.createdAt.toISOString(),
      })),
      meta: paginationMeta(total, page, take),
    };
  }

  async followStore(userId: string, slug: string) {
    const store = await this.prisma.sellerProfile.findUnique({ where: { storeSlug: slug } });
    if (!store) throw new NotFoundException('Store not found');
    if (store.userId === userId) throw new BadRequestException('Cannot follow your own store');

    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId: userId, followingId: store.userId } },
      create: { followerId: userId, followingId: store.userId },
      update: {},
    });

    return { following: true };
  }

  async unfollowStore(userId: string, slug: string) {
    const store = await this.prisma.sellerProfile.findUnique({ where: { storeSlug: slug } });
    if (!store) throw new NotFoundException('Store not found');

    await this.prisma.follow.deleteMany({
      where: { followerId: userId, followingId: store.userId },
    });

    return { following: false };
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

  // ── Analytics ──

  async revenueAnalytics(userId: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
    await this.assertSeller(userId);
    const now = new Date();
    let startDate: Date;
    const groupFormat: Record<string, string> = {
      daily: 'YYYY-MM-DD',
      weekly: 'YYYY-WW',
      monthly: 'YYYY-MM',
    };

    switch (period) {
      case 'daily': startDate = new Date(now.getTime() - 30 * 864e5); break;
      case 'weekly': startDate = new Date(now.getTime() - 12 * 7 * 864e5); break;
      case 'monthly': startDate = new Date(now.getTime() - 365 * 864e5); break;
    }

    const items = await this.prisma.orderItem.findMany({
      where: {
        sellerId: userId,
        status: 'DELIVERED',
        order: { createdAt: { gte: startDate } },
      },
      select: {
        sellerEarningPaise: true,
        order: { select: { createdAt: true } },
      },
      orderBy: { order: { createdAt: 'asc' } },
    });

    const grouped: Record<string, { revenue: number; count: number }> = {};
    items.forEach((item) => {
      const d = item.order.createdAt;
      let key: string;
      if (period === 'daily') key = d.toISOString().split('T')[0];
      else if (period === 'weekly') {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[key]) grouped[key] = { revenue: 0, count: 0 };
      grouped[key].revenue += Number(item.sellerEarningPaise);
      grouped[key].count += 1;
    });

    return {
      period,
      data: Object.entries(grouped).map(([date, vals]) => ({ date, ...vals })),
      totalRevenue: items.reduce((s, i) => s + Number(i.sellerEarningPaise), 0),
      totalOrders: items.length,
    };
  }

  async topProducts(userId: string, limit = 10) {
    await this.assertSeller(userId);
    const products = await this.prisma.product.findMany({
      where: { sellerId: userId, deletedAt: null },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: {
        id: true, title: true, slug: true, pricePaise: true, status: true,
        viewCount: true, favoriteCount: true, quantity: true, createdAt: true,
        media: { where: { isPrimary: true }, take: 1, select: { url: true } },
        _count: { select: { orderItems: true } },
      },
    });

    const bestSellers = [...products].sort((a, b) => b._count.orderItems - a._count.orderItems).slice(0, 5);
    const worstPerforming = [...products].sort((a, b) => a._count.orderItems - b._count.orderItems).slice(0, 5);

    return { bestSellers, worstPerforming };
  }

  async categoryPerformance(userId: string) {
    await this.assertSeller(userId);
    const products = await this.prisma.product.findMany({
      where: { sellerId: userId, deletedAt: null },
      select: {
        category: { select: { id: true, name: true, slug: true } },
        pricePaise: true, status: true,
        _count: { select: { orderItems: true } },
      },
    });

    const grouped: Record<string, { products: number; sold: number; revenue: number; active: number; categoryName: string }> = {};
    products.forEach((p) => {
      const catId = p.category?.id || 'uncategorized';
      const catName = p.category?.name || 'Uncategorized';
      if (!grouped[catId]) grouped[catId] = { products: 0, sold: 0, revenue: 0, active: 0, categoryName: catName };
      grouped[catId].products += 1;
      grouped[catId].sold += p._count.orderItems;
      if (p.status === 'ACTIVE') grouped[catId].active += 1;
    });

    return Object.entries(grouped).map(([id, data]) => ({ id, name: data.categoryName, products: data.products, sold: data.sold, revenue: data.revenue, active: data.active }));
  }

  async analyticsOverview(userId: string) {
    await this.assertSeller(userId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5);
    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5);

    const [totalOrders, orders30d, orders7d, revenue30d, views30d, conversions] = await Promise.all([
      this.prisma.orderItem.count({ where: { sellerId: userId, status: 'DELIVERED' } }),
      this.prisma.orderItem.count({ where: { sellerId: userId, order: { createdAt: { gte: thirtyDaysAgo } } } }),
      this.prisma.orderItem.count({ where: { sellerId: userId, order: { createdAt: { gte: sevenDaysAgo } } } }),
      this.prisma.orderItem.aggregate({
        where: { sellerId: userId, status: 'DELIVERED', order: { createdAt: { gte: thirtyDaysAgo } } },
        _sum: { sellerEarningPaise: true },
      }),
      this.prisma.productView.count({ where: { product: { sellerId: userId }, createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.orderItem.count({ where: { sellerId: userId, order: { createdAt: { gte: thirtyDaysAgo } } } }),
    ]);

    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { rating: true, totalSales: true, totalRevenuePaise: true },
    });

    return {
      totalOrders,
      ordersLast30d: orders30d,
      ordersLast7d: orders7d,
      revenueLast30dPaise: revenue30d._sum.sellerEarningPaise || 0,
      viewsLast30d: views30d,
      conversionRate: views30d > 0 ? ((orders30d / views30d) * 100).toFixed(2) : '0',
      averageOrderValue: orders30d > 0 ? Math.round(Number(revenue30d._sum.sellerEarningPaise || 0) / orders30d) : 0,
      rating: seller?.rating || 0,
      totalSales: seller?.totalSales || 0,
      totalRevenuePaise: seller?.totalRevenuePaise.toString() || '0',
    };
  }

  // ── Customers ──

  async customers(userId: string, page = 1, limit = 24) {
    await this.assertSeller(userId);
    const { skip, take } = this.paginate(page, limit);

    const buyers = await this.prisma.orderItem.findMany({
      where: { sellerId: userId },
      select: {
        order: {
          select: {
            buyerId: true,
            buyer: {
              select: {
                id: true, username: true, displayName: true, avatarUrl: true,
                city: true, country: true, createdAt: true, isVerified: true,
                _count: { select: { ordersAsBuyer: true } },
              },
            },
          },
        },
      },
      distinct: ['orderId'],
      orderBy: { createdAt: 'desc' },
    });

    const unique = new Map();
    buyers.forEach((b) => {
      const buyer = b.order.buyer;
      if (buyer && !unique.has(buyer.id)) unique.set(buyer.id, buyer);
    });

    const items = Array.from(unique.values()).slice(skip, skip + take);
    return { data: items, meta: this.paginationMeta(unique.size, page, take) };
  }

  async customerOrders(userId: string, buyerId: string, page = 1, limit = 24) {
    await this.assertSeller(userId);
    const { skip, take } = this.paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { buyerId, items: { some: { sellerId: userId } } },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { where: { sellerId: userId }, include: { product: { select: { title: true, slug: true, pricePaise: true } } } },
          shippingAddress: { select: { city: true, state: true } },
        },
      }),
      this.prisma.order.count({ where: { buyerId, items: { some: { sellerId: userId } } } }),
    ]);
    return { data: items, meta: this.paginationMeta(total, page, take) };
  }

  // ── Followers ──

  async followers(userId: string, page = 1, limit = 24) {
    await this.assertSeller(userId);
    const { skip, take } = this.paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followingId: userId },
        skip,
        take,
        include: {
          follower: {
            select: {
              id: true, username: true, displayName: true, avatarUrl: true,
              isVerified: true, city: true, country: true,
              _count: { select: { followers: true, follows: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.follow.count({ where: { followingId: userId } }),
    ]);
    return {
      data: items.map((i) => ({ ...i.follower, followedAt: i.createdAt })),
      meta: this.paginationMeta(total, page, take),
    };
  }

  // ── Store settings ──

  async getSettings(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { username: true, email: true, displayName: true, avatarUrl: true, coverUrl: true, bio: true, city: true, state: true, country: true, socialLinks: true } },
      },
    });
    if (!seller) throw new NotFoundException('Seller profile not found');
    return seller;
  }

  async updateSettings(userId: string, data: Record<string, unknown>) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');

    return this.prisma.sellerProfile.update({
      where: { userId },
      data: {
        storeName: data.storeName as string | undefined,
        storeDescription: data.storeDescription as string | undefined,
        storeLogoUrl: data.storeLogoUrl as string | undefined,
        storeBannerUrl: data.storeBannerUrl as string | undefined,
        businessType: data.businessType as string | undefined,
        isVacationMode: data.isVacationMode as boolean | undefined,
        vacationMessage: data.vacationMessage as string | undefined,
        policies: data.policies as any,
        ...(data.announcement ? { policies: { ...(seller.policies as any || {}), announcement: data.announcement } } : {}),
        ...(data.socialLinks ? { policies: { ...(seller.policies as any || {}), socialLinks: data.socialLinks } } : {}),
      },
    });
  }

  async setFeatured(userId: string, productId: string) {
    await this.assertSeller(userId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId: userId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existingFeatured = await this.prisma.product.findFirst({
      where: { sellerId: userId, tags: { has: 'featured' }, deletedAt: null },
    });

    if (existingFeatured) {
      await this.prisma.product.update({
        where: { id: existingFeatured.id },
        data: { tags: existingFeatured.tags.filter((t) => t !== 'featured') },
      });
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: { tags: [...(product.tags || []), 'featured'] },
    });
  }

  async removeFeatured(userId: string, productId: string) {
    await this.assertSeller(userId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId: userId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({
      where: { id: productId },
      data: { tags: (product.tags || []).filter((t) => t !== 'featured') },
    });
  }

  // ── Inventory alerts ──

  async inventoryAlerts(userId: string) {
    await this.assertSeller(userId);
    const [lowStock, outOfStock, reserved] = await Promise.all([
      this.prisma.product.findMany({
        where: { sellerId: userId, deletedAt: null, status: 'ACTIVE', quantity: { gt: 0, lte: 5 } },
        select: { id: true, title: true, slug: true, quantity: true, status: true, pricePaise: true, media: { where: { isPrimary: true }, take: 1, select: { url: true } } },
        orderBy: { quantity: 'asc' },
      }),
      this.prisma.product.count({ where: { sellerId: userId, deletedAt: null, status: 'ACTIVE', quantity: 0 } }),
      this.prisma.product.count({ where: { sellerId: userId, deletedAt: null, status: 'RESERVED' } }),
    ]);
    return {
      lowStock: lowStock.map((p) => ({ ...p, thumbnailUrl: p.media[0]?.url || null, media: undefined })),
      outOfStockCount: outOfStock,
      reservedCount: reserved,
    };
  }

  // ── Helpers ──

  private async assertSeller(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    return seller;
  }

  private paginate(page: number, limit: number) {
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));
    return { skip: (p - 1) * l, take: l, page: p, limit: l };
  }

  private paginationMeta(total: number, page: number, take: number) {
    const totalPages = Math.ceil(total / take);
    return { page, limit: take, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
  }
}
