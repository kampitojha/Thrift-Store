import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../config/redis.module';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getRecommendedProducts(userId?: string, limit = 20) {
    if (userId) {
      const personalized = await this.personalizedRecommendations(userId, limit);
      if (personalized.length >= limit) return personalized;
      const remaining = limit - personalized.length;
      const trending = await this.getTrending(remaining);
      return [...personalized, ...trending];
    }
    return this.getTrending(limit);
  }

  private async personalizedRecommendations(userId: string, limit: number) {
    const cacheKey = `rec:personalized:${userId}`;
    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached?.length) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: cached }, status: 'ACTIVE', deletedAt: null },
        include: { media: { where: { isPrimary: true }, take: 1 } },
        take: limit,
      });
      if (products.length) return this.formatProducts(products);
    }

    const viewedCategories = await this.prisma.productView.findMany({
      where: { userId },
      include: { product: { select: { categoryId: true, tags: true, brandId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const categoryIds = [...new Set(viewedCategories.map((v) => v.product?.categoryId).filter(Boolean))];
    const tags = [...new Set(viewedCategories.flatMap((v) => v.product?.tags || []))];
    const brandIds = [...new Set(viewedCategories.map((v) => v.product?.brandId).filter(Boolean))];

    const wishlistProductIds = await this.prisma.wishlistItem.findMany({
      where: { userId },
      select: { productId: true },
    });
    const wishlistedIds = new Set(wishlistProductIds.map((w) => w.productId));

    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      deletedAt: null,
      id: { notIn: [...viewedCategories.map((v) => v.productId).filter(Boolean), ...Array.from(wishlistedIds)] },
    };

    const orConditions: Record<string, unknown>[] = [];
    if (categoryIds.length) orConditions.push({ categoryId: { in: categoryIds } });
    if (tags.length) orConditions.push({ tags: { hasSome: tags } });
    if (brandIds.length) orConditions.push({ brandId: { in: brandIds } });
    if (orConditions.length) where.OR = orConditions;

    const products = await this.prisma.product.findMany({
      where: where as any,
      include: { media: { where: { isPrimary: true }, take: 1 } },
      orderBy: [{ viewCount: 'desc' }, { soldCount: 'desc' }, { favoriteCount: 'desc' }],
      take: limit,
    });

    const ids = products.map((p) => p.id);
    await this.redis.set(cacheKey, ids, 900);

    return this.formatProducts(products);
  }

  async getRelatedProducts(productId: string, limit = 12) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, brandId: true, tags: true, gender: true, condition: true },
    });
    if (!product) return [];

    const where: Record<string, unknown> = {
      id: { not: productId },
      status: 'ACTIVE',
      deletedAt: null,
      OR: [
        { categoryId: product.categoryId },
        ...(product.brandId ? [{ brandId: product.brandId }] : []),
        ...(product.tags?.length ? [{ tags: { hasSome: product.tags } }] : []),
        ...(product.gender ? [{ gender: product.gender }] : []),
        ...(product.condition ? [{ condition: product.condition }] : []),
      ],
    };

    const products = await this.prisma.product.findMany({
      where: where as any,
      include: { media: { where: { isPrimary: true }, take: 1 } },
      orderBy: [{ viewCount: 'desc' }, { soldCount: 'desc' }, { favoriteCount: 'desc' }],
      take: limit,
    });

    return this.formatProducts(products);
  }

  async getSimilarProducts(productId: string, limit = 12) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, tags: true, pricePaise: true, condition: true },
    });
    if (!product) return [];

    const priceRange = product.pricePaise * 0.5;
    const products = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        status: 'ACTIVE',
        deletedAt: null,
        categoryId: product.categoryId,
        pricePaise: { gte: Math.max(0, product.pricePaise - priceRange), lte: product.pricePaise + priceRange },
        condition: product.condition,
      },
      include: { media: { where: { isPrimary: true }, take: 1 } },
      orderBy: [{ viewCount: 'desc' }, { favoriteCount: 'desc' }],
      take: limit,
    });

    return this.formatProducts(products);
  }

  async getTrending(limit = 20) {
    const cacheKey = 'rec:trending';
    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached?.length) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: cached }, status: 'ACTIVE', deletedAt: null },
        include: { media: { where: { isPrimary: true }, take: 1 } },
        take: limit,
      });
      if (products.length) return this.formatProducts(products);
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null, publishedAt: { gte: sevenDaysAgo } },
      include: { media: { where: { isPrimary: true }, take: 1 } },
      orderBy: [{ viewCount: 'desc' }, { soldCount: 'desc' }, { favoriteCount: 'desc' }],
      take: limit,
    });

    const ids = products.map((p) => p.id);
    await this.redis.set(cacheKey, ids, 600);

    return this.formatProducts(products);
  }

  async getPopular(limit = 20) {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      include: { media: { where: { isPrimary: true }, take: 1 } },
      orderBy: [{ viewCount: 'desc' }, { favoriteCount: 'desc' }, { soldCount: 'desc' }],
      take: limit,
    });
    return this.formatProducts(products);
  }

  async getNewArrivals(limit = 20) {
    const cacheKey = 'rec:new-arrivals';
    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached?.length) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: cached }, status: 'ACTIVE', deletedAt: null },
        include: { media: { where: { isPrimary: true }, take: 1 } },
        take: limit,
      });
      if (products.length) return this.formatProducts(products);
    }

    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      include: { media: { where: { isPrimary: true }, take: 1 } },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    const ids = products.map((p) => p.id);
    await this.redis.set(cacheKey, ids, 300);

    return this.formatProducts(products);
  }

  async getBestSellers(limit = 20) {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null, soldCount: { gt: 0 } },
      include: { media: { where: { isPrimary: true }, take: 1 } },
      orderBy: { soldCount: 'desc' },
      take: limit,
    });
    return this.formatProducts(products);
  }

  async getPeopleAlsoViewed(productId: string, limit = 12) {
    const productViews = await this.prisma.productView.findMany({
      where: { productId },
      select: { sessionId: true, userId: true },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const userIds = [...new Set(productViews.map((v) => v.userId).filter(Boolean))] as string[];
    const sessionIds = [...new Set(productViews.map((v) => v.sessionId).filter(Boolean))] as string[];

    if (!userIds.length && !sessionIds.length) return this.getRelatedProducts(productId, limit);

    const alsoViewed = await this.prisma.productView.findMany({
      where: {
        productId: { not: productId },
        OR: [
          ...(userIds.length ? [{ userId: { in: userIds } }] : []),
          ...(sessionIds.length ? [{ sessionId: { in: sessionIds } }] : []),
        ],
      },
      select: { productId: true },
      take: 200,
    });

    const productIdCounts = alsoViewed.reduce<Record<string, number>>((acc, v) => {
      acc[v.productId] = (acc[v.productId] || 0) + 1;
      return acc;
    }, {});

    const sortedIds = Object.entries(productIdCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);

    if (!sortedIds.length) return this.getRelatedProducts(productId, limit);

    const products = await this.prisma.product.findMany({
      where: { id: { in: sortedIds }, status: 'ACTIVE', deletedAt: null },
      include: { media: { where: { isPrimary: true }, take: 1 } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    return this.formatProducts(sortedIds.map((id) => productMap.get(id)).filter(Boolean));
  }

  async getFrequentlyBoughtTogether(productId: string, limit = 12) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
      take: 100,
    });

    const orderIds = [...new Set(orderItems.map((oi) => oi.orderId))];
    if (!orderIds.length) return this.getRelatedProducts(productId, limit);

    const coItems = await this.prisma.orderItem.findMany({
      where: { orderId: { in: orderIds }, productId: { not: productId } },
      select: { productId: true },
    });

    const counts = coItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.productId] = (acc[item.productId] || 0) + 1;
      return acc;
    }, {});

    const sortedIds = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);

    if (!sortedIds.length) return this.getRelatedProducts(productId, limit);

    const products = await this.prisma.product.findMany({
      where: { id: { in: sortedIds }, status: 'ACTIVE', deletedAt: null },
      include: { media: { where: { isPrimary: true }, take: 1 } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    return this.formatProducts(sortedIds.map((id) => productMap.get(id)).filter(Boolean));
  }

  async getPersonalizedFeed(userId: string, limit = 30) {
    const sections = [
      { key: 'continue_shopping', label: 'Continue Shopping', items: await this.getContinueShopping(userId, 10) },
      { key: 'trending', label: 'Trending Now', items: await this.getTrending(10) },
      { key: 'recommended', label: 'Recommended For You', items: await this.personalizedRecommendations(userId, 10) },
      { key: 'new_arrivals', label: 'New Arrivals', items: await this.getNewArrivals(10) },
      { key: 'best_sellers', label: 'Best Sellers', items: await this.getBestSellers(10) },
      { key: 'popular', label: 'Popular Picks', items: await this.getPopular(10) },
    ];

    return sections
      .filter((s) => s.items.length >= 2)
      .slice(0, 6);
  }

  async getRecentlyViewed(userId: string, limit = 20) {
    const views = await this.prisma.productView.findMany({
      where: { userId },
      include: { product: { include: { media: { where: { isPrimary: true }, take: 1 } } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const seen = new Set<string>();
    const unique: typeof views = [];
    for (const v of views) {
      if (!seen.has(v.productId) && v.product && v.product.status === 'ACTIVE' && !v.product.deletedAt) {
        seen.add(v.productId);
        unique.push(v);
      }
    }

    return unique.map((v) => this.formatProduct(v.product));
  }

  private async getContinueShopping(userId: string, limit: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: { include: { media: { where: { isPrimary: true }, take: 1 } } } } } },
    });

    if (cart?.items.length) {
      return cart.items.map((ci) => this.formatProduct(ci.product));
    }

    const wishlistItems = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: { include: { media: { where: { isPrimary: true }, take: 1 } } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return wishlistItems.map((wi) => this.formatProduct(wi.product)).filter(Boolean);
  }

  async getTrendingCategories(limit = 10) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
    const views = await this.prisma.productView.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      include: { product: { select: { categoryId: true } } },
      take: 5000,
    });

    const counts = views.reduce<Record<string, number>>((acc, v) => {
      if (v.product?.categoryId) acc[v.product.categoryId] = (acc[v.product.categoryId] || 0) + 1;
      return acc;
    }, {});

    const sortedIds = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, limit).map(([id]) => id);
    if (!sortedIds.length) return [];

    const categories = await this.prisma.category.findMany({
      where: { id: { in: sortedIds }, isActive: true },
    });

    return sortedIds.map((id) => categories.find((c) => c.id === id)).filter(Boolean);
  }

  async getTrendingSearches(limit = 10) {
    const searches = await this.redis.client.zrevrange('trending:searches', 0, limit - 1, 'WITHSCORES');
    const result: Array<{ query: string; score: number }> = [];
    for (let i = 0; i < searches.length; i += 2) {
      result.push({ query: searches[i], score: parseInt(searches[i + 1], 10) });
    }
    return result;
  }

  private formatProducts(products: any[]) {
    return products.map((p) => this.formatProduct(p));
  }

  private formatProduct(product: any) {
    if (!product) return null;
    const media = product.media || [];
    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      pricePaise: product.pricePaise,
      originalPricePaise: product.originalPricePaise,
      condition: product.condition,
      status: product.status,
      image: media.find((m: any) => m.isPrimary)?.url || media[0]?.url || null,
      thumbnail: media.find((m: any) => m.isPrimary)?.thumbUrl || media[0]?.thumbUrl || null,
      viewCount: product.viewCount,
      favoriteCount: product.favoriteCount,
      soldCount: product.soldCount,
      tags: product.tags,
    };
  }
}
