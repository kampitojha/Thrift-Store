import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const ACTION_POINTS: Record<string, { points: number; xp: number; description: string }> = {
  signup: { points: 100, xp: 50, description: 'Welcome! Created an account' },
  first_purchase: { points: 500, xp: 200, description: 'First purchase completed' },
  purchase: { points: 100, xp: 50, description: 'Order placed' },
  review: { points: 50, xp: 25, description: 'Wrote a product review' },
  social_share: { points: 20, xp: 10, description: 'Shared a product' },
  daily_login: { points: 10, xp: 5, description: 'Daily login bonus' },
  complete_profile: { points: 50, xp: 25, description: 'Completed profile' },
  refer_friend: { points: 200, xp: 100, description: 'Referred a friend' },
  wishlist_add: { points: 5, xp: 2, description: 'Added item to wishlist' },
  seller_list: { points: 100, xp: 50, description: 'Listed a product' },
  seller_sold: { points: 200, xp: 100, description: 'Sold a product' },
  birthday: { points: 200, xp: 100, description: 'Birthday bonus' },
};

const LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500, 3000, 6000, 12000, 24000, 50000];

const BADGE_DEFINITIONS = [
  { id: 'first_purchase', name: 'First Purchase', description: 'Made your first purchase', icon: 'shopping-bag' },
  { id: 'collector', name: 'Collector', description: 'Bought 10 items', icon: 'archive' },
  { id: 'power_shopper', name: 'Power Shopper', description: 'Bought 50 items', icon: 'zap' },
  { id: 'reviewer', name: 'Reviewer', description: 'Wrote 5 reviews', icon: 'message-square' },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Shared 10 items', icon: 'share-2' },
  { id: 'trendsetter', name: 'Trendsetter', description: 'Listed 10 items', icon: 'sparkles' },
  { id: 'top_seller', name: 'Top Seller', description: 'Sold 50 items', icon: 'award' },
  { id: 'early_adopter', name: 'Early Adopter', description: 'Joined in first month', icon: 'clock' },
  { id: 'referral_star', name: 'Referral Star', description: 'Referred 5 friends', icon: 'users' },
  { id: 'loyal_customer', name: 'Loyal Customer', description: '100 days active', icon: 'heart' },
];

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async earnPoints(userId: string, action: string, reference?: string, description?: string) {
    const config = ACTION_POINTS[action];
    if (!config) return { points: 0, xp: 0, total: 0, level: 1 };

    const account = await this.prisma.loyaltyAccount.upsert({
      where: { userId },
      create: { userId, points: config.points, coins: 0, level: 1, badges: [] },
      update: { points: { increment: config.points } },
    });

    await this.prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        points: config.points,
        reason: description || config.description,
        reference,
      },
    });

    const newLevel = this.calculateLevel(account.points + config.points);
    let levelUp = false;
    if (newLevel > account.level) {
      await this.prisma.loyaltyAccount.update({
        where: { userId },
        data: { level: newLevel },
      });
      levelUp = true;
    }

    const badges = await this.checkBadges(userId, account.badges as string[]);

    return {
      points: config.points,
      xp: config.xp,
      total: account.points + config.points,
      level: newLevel,
      levelUp,
      badges,
    };
  }

  async getAccount(userId: string) {
    const account = await this.prisma.loyaltyAccount.findUnique({ where: { userId } });
    if (!account) {
      return {
        points: 0, coins: 0, level: 1, badges: [],
        nextLevelXp: LEVEL_THRESHOLDS[1],
        progress: 0,
        recentTransactions: [],
      };
    }

    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const currentLevelXp = account.points;
    const nextThreshold = LEVEL_THRESHOLDS[Math.min(account.level, LEVEL_THRESHOLDS.length - 1)];
    const prevThreshold = LEVEL_THRESHOLDS[account.level - 1] || 0;
    const progress = nextThreshold > prevThreshold ? ((currentLevelXp - prevThreshold) / (nextThreshold - prevThreshold)) * 100 : 100;

    return {
      points: account.points,
      coins: account.coins,
      level: account.level,
      badges: account.badges,
      nextLevelXp: nextThreshold,
      progress: Math.min(100, Math.max(0, progress)),
      recentTransactions: transactions.map((t) => ({
        id: t.id,
        points: t.points,
        reason: t.reason,
        reference: t.reference,
        createdAt: t.createdAt,
      })),
    };
  }

  async redeemPoints(userId: string, points: number, rewardType: string, reference?: string) {
    const account = await this.prisma.loyaltyAccount.findUnique({ where: { userId } });
    if (!account || account.points < points) {
      return { success: false, error: 'Insufficient points' };
    }

    const coinValue = Math.floor(points / 10);

    const [updated] = await Promise.all([
      this.prisma.loyaltyAccount.update({
        where: { userId },
        data: { points: { decrement: points }, coins: { increment: coinValue } },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          points: -points,
          reason: `Redeemed ${points} points for ${rewardType}`,
          reference,
        },
      }),
    ]);

    return { success: true, pointsRedeemed: points, coinsEarned: coinValue, total: updated.points };
  }

  async getLeaderboard(limit = 50) {
    const leaders = await this.prisma.loyaltyAccount.findMany({
      orderBy: { points: 'desc' },
      take: limit,
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    return leaders.map((l, i) => ({
      rank: i + 1,
      userId: l.userId,
      username: l.user.username,
      displayName: l.user.displayName,
      avatarUrl: l.user.avatarUrl,
      points: l.points,
      level: l.level,
      badges: l.badges,
    }));
  }

  async getBadges() {
    return BADGE_DEFINITIONS;
  }

  async getAvailableRewards() {
    return [
      { id: 'discount_50', name: 'Rs.50 Off', description: 'Get Rs.50 off on next purchase', pointsCost: 500, type: 'coupon', value: 5000 },
      { id: 'discount_100', name: 'Rs.100 Off', description: 'Get Rs.100 off on next purchase', pointsCost: 900, type: 'coupon', value: 10000 },
      { id: 'discount_250', name: 'Rs.250 Off', description: 'Get Rs.250 off on next purchase', pointsCost: 2000, type: 'coupon', value: 25000 },
      { id: 'free_shipping', name: 'Free Shipping', description: 'Free shipping on next order', pointsCost: 300, type: 'free_shipping', value: 0 },
      { id: 'featured_listing', name: 'Featured Listing', description: 'Feature your product for 7 days', pointsCost: 5000, type: 'featured', value: 7 },
      { id: 'boost_listing', name: 'Boost Listing', description: 'Boost your listing for 3 days', pointsCost: 2000, type: 'boost', value: 3 },
    ];
  }

  private calculateLevel(totalXp: number): number {
    let level = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    }
    return level;
  }

  private async checkBadges(userId: string, currentBadges: string[]) {
    const newBadges: string[] = [];
    const badgeSet = new Set(currentBadges);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: { select: { ordersAsBuyer: true, reviewsAuthored: true } },
        profile: { select: { itemsSold: true } },
      },
    });

    if (!user) return newBadges;

    const counts = {
      purchases: user._count.ordersAsBuyer,
      reviews: user._count.reviewsAuthored,
      sales: user.profile?.itemsSold || 0,
    };

    const checks: Array<{ badgeId: string; earned: boolean }> = [
      { badgeId: 'first_purchase', earned: counts.purchases >= 1 },
      { badgeId: 'collector', earned: counts.purchases >= 10 },
      { badgeId: 'power_shopper', earned: counts.purchases >= 50 },
      { badgeId: 'reviewer', earned: counts.reviews >= 5 },
      { badgeId: 'top_seller', earned: counts.sales >= 50 },
      { badgeId: 'trendsetter', earned: counts.sales >= 10 },
    ];

    for (const check of checks) {
      if (check.earned && !badgeSet.has(check.badgeId)) {
        newBadges.push(check.badgeId);
        badgeSet.add(check.badgeId);
      }
    }

    if (newBadges.length) {
      await this.prisma.loyaltyAccount.update({
        where: { userId },
        data: { badges: Array.from(badgeSet) },
      });
    }

    return newBadges;
  }
}
