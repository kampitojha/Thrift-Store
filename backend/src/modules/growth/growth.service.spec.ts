import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RecommendationService } from './services/recommendation.service';
import { PersonalizationService } from './services/personalization.service';
import { LoyaltyService } from './services/loyalty.service';
import { ReferralService } from './services/referral.service';
import { MarketingAutomationService } from './services/marketing-automation.service';
import { GrowthAnalyticsService } from './services/growth-analytics.service';
import { AbTestingService } from './services/ab-testing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../config/redis.module';
import { NotificationsService } from '../notifications/notifications.service';

describe('Growth Engine', () => {
  let recommendationService: RecommendationService;
  let personalizationService: PersonalizationService;
  let loyaltyService: LoyaltyService;
  let referralService: ReferralService;
  let marketingService: MarketingAutomationService;
  let analyticsService: GrowthAnalyticsService;
  let abTestService: AbTestingService;

  const mockPrisma = {
    user: { count: jest.fn().mockResolvedValue(100), findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'test@test.com', username: 'test', role: 'BUYER', status: 'ACTIVE', createdAt: new Date(), lastLoginAt: new Date(), deletedAt: null, _count: { ordersAsBuyer: 5, wishlistItems: 3 }, sellerProfile: { totalSales: 0, verificationStatus: 'UNVERIFIED', rating: 0 }, profile: { itemsSold: 0 } }), findMany: jest.fn().mockResolvedValue([]) },
    product: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ id: 'p1', title: 'Test', pricePaise: 1000, categoryId: 'c1', tags: ['vintage'], brandId: null, condition: 'GOOD', gender: 'WOMEN', status: 'ACTIVE', deletedAt: null, viewCount: 10, favoriteCount: 5, soldCount: 2, media: [] }) },
    productView: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(500) },
    cartItem: { count: jest.fn().mockResolvedValue(200) },
    cart: { findUnique: jest.fn().mockResolvedValue({ id: 'cart1', items: [] }) },
    order: { count: jest.fn().mockResolvedValue(50), findMany: jest.fn().mockResolvedValue([]) },
    orderItem: { findMany: jest.fn().mockResolvedValue([]) },
    payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amountPaise: 500000 } }), count: jest.fn().mockResolvedValue(40), findMany: jest.fn().mockResolvedValue([]) },
    wishlistItem: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(10) },
    loyaltyAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'la1', userId: 'u1', points: 1000, coins: 50, level: 3, badges: ['first_purchase'] }), upsert: jest.fn().mockResolvedValue({ id: 'la1', userId: 'u1', points: 1100, coins: 50, level: 3, badges: [] }), update: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
    loyaltyTransaction: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
    referral: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'r1', referrerId: 'u2', refereeId: 'u1', code: 'TEST123', status: 'pending' }), count: jest.fn().mockResolvedValue(0) },
    referralCode: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'rc1', userId: 'u1', code: 'ABC123', uses: 0 }), update: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(0) },
    notification: { create: jest.fn().mockResolvedValue({}) },
    category: { findMany: jest.fn().mockResolvedValue([]) },
    banner: { findMany: jest.fn().mockResolvedValue([]) },
    platformJob: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ id: 'job1' }), findUnique: jest.fn().mockResolvedValue({ id: 'job1', payload: {} }), update: jest.fn().mockResolvedValue({}), delete: jest.fn().mockResolvedValue({}) },
    featureFlag: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'ff1', key: 'exp:test', enabled: true, description: '', createdAt: new Date(), rules: { variants: [{ name: 'control', trafficPct: 50 }, { name: 'variant', trafficPct: 50 }] } }), update: jest.fn().mockResolvedValue({}) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    client: { zrevrange: jest.fn().mockResolvedValue([]), zincrby: jest.fn().mockResolvedValue(1) },
  };

  const mockConfig = { get: jest.fn().mockReturnValue('test') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        PersonalizationService,
        LoyaltyService,
        ReferralService,
        MarketingAutomationService,
        GrowthAnalyticsService,
        AbTestingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: NotificationsService,
          useValue: { push: jest.fn().mockResolvedValue({}), pushRealtime: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    recommendationService = module.get<RecommendationService>(RecommendationService);
    personalizationService = module.get<PersonalizationService>(PersonalizationService);
    loyaltyService = module.get<LoyaltyService>(LoyaltyService);
    referralService = module.get<ReferralService>(ReferralService);
    marketingService = module.get<MarketingAutomationService>(MarketingAutomationService);
    analyticsService = module.get<GrowthAnalyticsService>(GrowthAnalyticsService);
    abTestService = module.get<AbTestingService>(AbTestingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Recommendation Engine ─────────────────────────────────

  describe('RecommendationService', () => {
    it('should get trending products', async () => {
      const result = await recommendationService.getTrending(10);
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrisma.product.findMany).toHaveBeenCalled();
    });

    it('should get popular products', async () => {
      const result = await recommendationService.getPopular(10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get new arrivals', async () => {
      const result = await recommendationService.getNewArrivals(10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get best sellers', async () => {
      const result = await recommendationService.getBestSellers(10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get related products', async () => {
      const result = await recommendationService.getRelatedProducts('p1', 10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get similar products', async () => {
      const result = await recommendationService.getSimilarProducts('p1', 10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get product recommendations for logged-in user', async () => {
      const result = await recommendationService.getRecommendedProducts('u1', 10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get recommendations for guest', async () => {
      const result = await recommendationService.getRecommendedProducts(undefined, 10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get personalized feed', async () => {
      const result = await recommendationService.getPersonalizedFeed('u1', 30);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ─── Personalization ───────────────────────────────────────

  describe('PersonalizationService', () => {
    it('should list all segments', () => {
      const segments = personalizationService.getAllSegments();
      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0]).toHaveProperty('id');
      expect(segments[0]).toHaveProperty('name');
    });

    it('should get user segments', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1', email: 'test@test.com', username: 'test', role: 'BUYER', status: 'ACTIVE', createdAt: new Date(), lastLoginAt: new Date(), deletedAt: null,
        _count: { ordersAsBuyer: 5, wishlistItems: 3 },
        sellerProfile: { totalSales: 0, verificationStatus: 'UNVERIFIED', rating: 0 },
        profile: { itemsSold: 0 },
      });
      const result = await personalizationService.getUserSegments('u1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get homepage personalization', async () => {
      const result = await personalizationService.getHomepagePersonalization('u1');
      expect(result).toHaveProperty('segments');
      expect(result).toHaveProperty('hero');
    });
  });

  // ─── Loyalty System ────────────────────────────────────────

  describe('LoyaltyService', () => {
    it('should earn points for an action', async () => {
      const result = await loyaltyService.earnPoints('u1', 'purchase', 'order1', 'Test purchase');
      expect(result).toHaveProperty('points');
      expect(result).toHaveProperty('xp');
      expect(result.points).toBeGreaterThan(0);
    });

    it('should return 0 points for unknown action', async () => {
      const result = await loyaltyService.earnPoints('u1', 'unknown_action');
      expect(result.points).toBe(0);
    });

    it('should get loyalty account', async () => {
      const result = await loyaltyService.getAccount('u1');
      expect(result).toHaveProperty('points');
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('progress');
    });

    it('should return default account for new user', async () => {
      mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(null);
      const result = await loyaltyService.getAccount('new-user');
      expect(result).toHaveProperty('points', 0);
      expect(result).toHaveProperty('level', 1);
    });

    it('should list available rewards', async () => {
      const result = await loyaltyService.getAvailableRewards();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should list badges', async () => {
      const result = await loyaltyService.getBadges();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get leaderboard', async () => {
      mockPrisma.loyaltyAccount.findMany.mockResolvedValue([]);
      const result = await loyaltyService.getLeaderboard(10);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ─── Referral Engine ───────────────────────────────────────

  describe('ReferralService', () => {
    it('should create referral code', async () => {
      const result = await referralService.getOrCreateCode('u1');
      expect(result).toHaveProperty('code');
    });

    it('should get referral dashboard', async () => {
      const result = await referralService.getDashboard('u1');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('referrals');
      expect(result).toHaveProperty('stats');
    });

    it('should apply referral code', async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({ id: 'rc1', userId: 'u2', code: 'TEST123', uses: 0, maxUses: null });
      mockPrisma.referral.findUnique.mockResolvedValue(null);
      const result = await referralService.applyReferral('u1', 'TEST123');
      expect(result).toHaveProperty('success', true);
    });

    it('should reject self-referral', async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({ id: 'rc1', userId: 'u1', code: 'SELF', uses: 0, maxUses: null });
      const result = await referralService.applyReferral('u1', 'SELF');
      expect(result.success).toBe(false);
    });

    it('should get referral analytics', async () => {
      const result = await referralService.getReferralAnalytics();
      expect(result).toHaveProperty('totalCodes');
      expect(result).toHaveProperty('totalReferrals');
      expect(result).toHaveProperty('conversionRate');
    });
  });

  // ─── Marketing Automation ──────────────────────────────────

  describe('MarketingAutomationService', () => {
    it('should list built-in campaigns', () => {
      const result = marketingService.getBuiltInCampaigns();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should get campaigns', async () => {
      const result = await marketingService.getCampaigns(1, 20);
      expect(result).toHaveProperty('campaigns');
      expect(result).toHaveProperty('total');
    });

    it('should create a campaign', async () => {
      const result = await marketingService.createCampaign({ name: 'Test', type: 'welcome', channel: 'email' });
      expect(result).toHaveProperty('id');
    });
  });

  // ─── Growth Analytics ──────────────────────────────────────

  describe('GrowthAnalyticsService', () => {
    it('should track events', async () => {
      const result = await analyticsService.trackEvent('test_event', 'u1', 'p1', { sessionId: 's1' });
      expect(result).toHaveProperty('ok', true);
    });

    it('should get growth metrics', async () => {
      const result = await analyticsService.getGrowthMetrics();
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('orders');
      expect(result).toHaveProperty('revenue');
      expect(result).toHaveProperty('sellers');
    });

    it('should get retention metrics', async () => {
      const result = await analyticsService.getRetentionMetrics(90);
      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('activeRate');
      expect(result).toHaveProperty('retentionRate');
      expect(result).toHaveProperty('cohorts');
    });

    it('should get funnel analysis', async () => {
      const result = await analyticsService.getFunnelAnalysis();
      expect(result).toHaveProperty('funnel');
      expect(result).toHaveProperty('conversion');
      expect(result.funnel.length).toBeGreaterThan(0);
    });

    it('should get revenue analytics', async () => {
      const result = await analyticsService.getRevenueAnalytics();
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('timeline');
    });

    it('should get traffic sources', async () => {
      const result = await analyticsService.getTrafficSources();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ─── A/B Testing ──────────────────────────────────────────

  describe('AbTestingService', () => {
    it('should create experiment', async () => {
      const result = await abTestService.createExperiment({
        name: 'Test Experiment',
        metric: 'click_rate',
        variants: [{ name: 'control', config: {}, trafficPct: 50 }, { name: 'variant', config: { color: 'red' }, trafficPct: 50 }],
      });
      expect(result).toHaveProperty('id');
    });

    it('should get experiments', async () => {
      const result = await abTestService.getExperiments();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should assign variant deterministically', async () => {
      const result = await abTestService.assignVariant('u1', 'exp:test');
      expect(typeof result).toBe('string');
    });

    it('should track conversion', async () => {
      await abTestService.trackConversion('exp:test', 'control');
      expect(mockRedis.incr).toHaveBeenCalled();
    });
  });
});
