import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../config/redis.module';

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  condition: (user: any) => boolean;
}

@Injectable()
export class PersonalizationService {
  private readonly logger = new Logger(PersonalizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private readonly segments: UserSegment[] = [
    { id: 'new_user', name: 'New Users', description: 'Users registered within 30 days', condition: (u) => {
      const daysSinceJoin = (Date.now() - new Date(u.createdAt).getTime()) / 86400_000;
      return daysSinceJoin <= 30;
    }},
    { id: 'returning_user', name: 'Returning Users', description: 'Users with 2+ orders', condition: (u) => (u._orderCount || 0) >= 2 },
    { id: 'high_value', name: 'High Value Buyers', description: 'Users with total spend > Rs.10,000', condition: (u) => (u._totalSpent || 0) >= 1_000_000 },
    { id: 'inactive', name: 'Inactive Users', description: 'No login in 90 days', condition: (u) => {
      if (!u.lastLoginAt) return true;
      return (Date.now() - new Date(u.lastLoginAt).getTime()) / 86400_000 > 90;
    }},
    { id: 'power_seller', name: 'Power Sellers', description: 'Sellers with 50+ items sold', condition: (u) => (u._itemsSold || 0) >= 50 },
    { id: 'premium_seller', name: 'Premium Sellers', description: 'Verified sellers with high rating', condition: (u) => u._isPremiumSeller || false },
    { id: 'frequent_buyer', name: 'Frequent Buyers', description: 'Users with 10+ orders', condition: (u) => (u._orderCount || 0) >= 10 },
    { id: 'window_shopper', name: 'Window Shoppers', description: 'Users with items in wishlist but no orders', condition: (u) => (u._wishlistCount || 0) > 0 && (u._orderCount || 0) === 0 },
  ];

  async getUserSegments(userId: string) {
    const cacheKey = `segments:${userId}`;
    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        sellerProfile: { select: { verificationStatus: true, totalSales: true, rating: true } },
        _count: { select: { ordersAsBuyer: true, wishlistItems: true } },
      },
    });

    if (!user) return [];

    const enriched = {
      ...user,
      _orderCount: user._count.ordersAsBuyer,
      _wishlistCount: user._count.wishlistItems,
      _totalSpent: await this.getUserTotalSpent(userId),
      _itemsSold: user.sellerProfile?.totalSales || 0,
      _isPremiumSeller: user.sellerProfile?.verificationStatus === 'APPROVED' && (user.sellerProfile?.rating || 0) >= 4.5,
    };

    const matched = this.segments.filter((s) => s.condition(enriched)).map((s) => s.id);
    await this.redis.set(cacheKey, matched, 3600);
    return matched;
  }

  async getUsersInSegment(segmentId: string, page = 1, limit = 50) {
    const segment = this.segments.find((s) => s.id === segmentId);
    if (!segment) return { users: [], total: 0 };

    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { ordersAsBuyer: true, wishlistItems: true } },
        sellerProfile: { select: { totalSales: true, verificationStatus: true, rating: true } },
      },
      take: Math.min(limit, 200),
      orderBy: { createdAt: 'desc' },
    });

    const enriched = await Promise.all(
      users.map(async (u) => ({
        ...u,
        _orderCount: u._count.ordersAsBuyer,
        _wishlistCount: u._count.wishlistItems,
        _totalSpent: await this.getUserTotalSpent(u.id),
        _itemsSold: u.sellerProfile?.totalSales || 0,
        _isPremiumSeller: u.sellerProfile?.verificationStatus === 'APPROVED' && (u.sellerProfile?.rating || 0) >= 4.5,
      })),
    );

    const matched = enriched.filter((u) => segment.condition(u));
    const total = matched.length;
    const skip = (page - 1) * limit;
    return { users: matched.slice(skip, skip + limit).map((u) => ({ id: u.id, email: u.email, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt })), total };
  }

  async getHomepagePersonalization(userId: string) {
    const segments = await this.getUserSegments(userId);
    const heroBanners = await this.getPersonalizedBanners(segments);

    return {
      segments,
      hero: heroBanners,
      showOnboarding: segments.includes('new_user'),
      showReactivation: segments.includes('inactive'),
      showPremiumUpsell: segments.includes('frequent_buyer') || segments.includes('high_value'),
    };
  }

  private async getPersonalizedBanners(segments: string[]) {
    const banners = await this.prisma.banner.findMany({
      where: { isActive: true, startsAt: { lte: new Date() }, OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
      orderBy: { sortOrder: 'asc' },
    });

    if (segments.includes('new_user')) {
      const welcomeBanner = banners.find((b) => b.placement === 'new_user');
      if (welcomeBanner) return [welcomeBanner, ...banners.filter((b) => b.placement === 'home_hero')];
    }

    return banners.filter((b) => b.placement === 'home_hero' || b.placement === 'home_secondary');
  }

  private async getUserTotalSpent(userId: string) {
    const result = await this.prisma.payment.aggregate({
      where: { order: { buyerId: userId }, status: 'CAPTURED' },
      _sum: { amountPaise: true },
    });
    return result._sum.amountPaise || 0;
  }

  getAllSegments() {
    return this.segments.map(({ id, name, description }) => ({ id, name, description }));
  }
}
