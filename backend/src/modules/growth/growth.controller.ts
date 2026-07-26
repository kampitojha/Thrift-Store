import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RecommendationService } from './services/recommendation.service';
import { PersonalizationService } from './services/personalization.service';
import { LoyaltyService } from './services/loyalty.service';
import { ReferralService } from './services/referral.service';
import { MarketingAutomationService } from './services/marketing-automation.service';
import { GrowthAnalyticsService } from './services/growth-analytics.service';
import { AbTestingService } from './services/ab-testing.service';
import { RecommendationQueryDto, PersonalizedFeedDto, LoyaltyEarnDto, RedeemPointsDto, ReferralCreateDto, ReferralApplyDto, CreateCampaignDto, UpdateCampaignDto, CreateExperimentDto, AnalyticsQueryDto } from './dto/growth.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Growth')
@ApiBearerAuth()
@Controller('growth')
export class GrowthController {
  constructor(
    private readonly recommendations: RecommendationService,
    private readonly personalization: PersonalizationService,
    private readonly loyalty: LoyaltyService,
    private readonly referrals: ReferralService,
    private readonly marketing: MarketingAutomationService,
    private readonly analytics: GrowthAnalyticsService,
    private readonly abTesting: AbTestingService,
  ) {}

  // ─── Recommendations ───────────────────────────────────────

  @Get('recommendations')
  async getRecommendations(@CurrentUser() user: AuthUser | undefined, @Query() query: RecommendationQueryDto) {
    if (query.strategy === 'trending') return this.recommendations.getTrending(query.limit || 20);
    if (query.strategy === 'popular') return this.recommendations.getPopular(query.limit || 20);
    if (query.strategy === 'new-arrivals') return this.recommendations.getNewArrivals(query.limit || 20);
    if (query.strategy === 'best-sellers') return this.recommendations.getBestSellers(query.limit || 20);
    if (query.strategy === 'similar' && query.productId) return this.recommendations.getSimilarProducts(query.productId, query.limit || 12);
    if (query.strategy === 'related' && query.productId) return this.recommendations.getRelatedProducts(query.productId, query.limit || 12);
    return this.recommendations.getRecommendedProducts(user?.id, query.limit || 20);
  }

  @Get('recommendations/related/:productId')
  async getRelated(@Param('productId') productId: string, @Query('limit') limit?: string) {
    return this.recommendations.getRelatedProducts(productId, parseInt(limit || '12'));
  }

  @Get('recommendations/similar/:productId')
  async getSimilar(@Param('productId') productId: string, @Query('limit') limit?: string) {
    return this.recommendations.getSimilarProducts(productId, parseInt(limit || '12'));
  }

  @Get('recommendations/people-also-viewed/:productId')
  async getPeopleAlsoViewed(@Param('productId') productId: string, @Query('limit') limit?: string) {
    return this.recommendations.getPeopleAlsoViewed(productId, parseInt(limit || '12'));
  }

  @Get('recommendations/frequently-bought-together/:productId')
  async getFrequentlyBoughtTogether(@Param('productId') productId: string, @Query('limit') limit?: string) {
    return this.recommendations.getFrequentlyBoughtTogether(productId, parseInt(limit || '12'));
  }

  @Get('recommendations/trending')
  async getTrending(@Query('limit') limit?: string) {
    return this.recommendations.getTrending(parseInt(limit || '20'));
  }

  @Get('recommendations/new-arrivals')
  async getNewArrivals(@Query('limit') limit?: string) {
    return this.recommendations.getNewArrivals(parseInt(limit || '20'));
  }

  @Get('recommendations/best-sellers')
  async getBestSellers(@Query('limit') limit?: string) {
    return this.recommendations.getBestSellers(parseInt(limit || '20'));
  }

  @Get('recommendations/trending-categories')
  async getTrendingCategories(@Query('limit') limit?: string) {
    return this.recommendations.getTrendingCategories(parseInt(limit || '10'));
  }

  @Get('recommendations/trending-searches')
  async getTrendingSearches(@Query('limit') limit?: string) {
    return this.recommendations.getTrendingSearches(parseInt(limit || '10'));
  }

  @Get('feed')
  async getPersonalizedFeed(@CurrentUser() user: AuthUser, @Query() query: PersonalizedFeedDto) {
    return this.recommendations.getPersonalizedFeed(user.id, query.limit || 30);
  }

  @Get('recently-viewed')
  async getRecentlyViewed(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.recommendations.getRecentlyViewed(user.id, parseInt(limit || '20'));
  }

  // ─── Personalization ────────────────────────────────────────

  @Get('personalization/segments')
  async getAllSegments() {
    return this.personalization.getAllSegments();
  }

  @Get('personalization/my-segments')
  async getMySegments(@CurrentUser() user: AuthUser) {
    return this.personalization.getUserSegments(user.id);
  }

  @Get('personalization/homepage')
  async getHomepagePersonalization(@CurrentUser() user: AuthUser) {
    return this.personalization.getHomepagePersonalization(user.id);
  }

  @Get('personalization/segments/:segmentId/users')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  async getSegmentUsers(@Param('segmentId') segmentId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.personalization.getUsersInSegment(segmentId, parseInt(page || '1'), parseInt(limit || '50'));
  }

  // ─── Loyalty ────────────────────────────────────────────────

  @Get('loyalty')
  async getLoyalty(@CurrentUser() user: AuthUser) {
    return this.loyalty.getAccount(user.id);
  }

  @Post('loyalty/earn')
  async earnPoints(@CurrentUser() user: AuthUser, @Body() dto: LoyaltyEarnDto) {
    return this.loyalty.earnPoints(user.id, dto.action, dto.reference, dto.description);
  }

  @Post('loyalty/redeem')
  async redeemPoints(@CurrentUser() user: AuthUser, @Body() dto: RedeemPointsDto) {
    return this.loyalty.redeemPoints(user.id, dto.points, dto.rewardType, dto.reference);
  }

  @Get('loyalty/badges')
  async getBadges() {
    return this.loyalty.getBadges();
  }

  @Get('loyalty/rewards')
  async getRewards() {
    return this.loyalty.getAvailableRewards();
  }

  @Get('loyalty/leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.loyalty.getLeaderboard(parseInt(limit || '50'));
  }

  // ─── Referrals ──────────────────────────────────────────────

  @Get('referrals/dashboard')
  async getReferralDashboard(@CurrentUser() user: AuthUser) {
    return this.referrals.getDashboard(user.id);
  }

  @Post('referrals/code')
  async createReferralCode(@CurrentUser() user: AuthUser, @Body() dto: ReferralCreateDto) {
    return this.referrals.getOrCreateCode(user.id, dto.code);
  }

  @Post('referrals/apply')
  async applyReferral(@CurrentUser() user: AuthUser, @Body() dto: ReferralApplyDto) {
    return this.referrals.applyReferral(user.id, dto.code);
  }

  @Post('referrals/:refereeId/complete')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  async completeReferral(@Param('refereeId') refereeId: string) {
    return this.referrals.completeReferral(refereeId);
  }

  // ─── Marketing Automation ───────────────────────────────────

  @Get('campaigns')
  async getCampaigns(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.marketing.getCampaigns(parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get('campaigns/built-in')
  async getBuiltInCampaigns() {
    return this.marketing.getBuiltInCampaigns();
  }

  @Post('campaigns')
  async createCampaign(@Body() dto: CreateCampaignDto) {
    return this.marketing.createCampaign(dto as any);
  }

  @Patch('campaigns/:id')
  async updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.marketing.updateCampaign(id, dto);
  }

  @Delete('campaigns/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  async deleteCampaign(@Param('id') id: string) {
    return this.marketing.deleteCampaign(id);
  }

  @Post('campaigns/trigger-abandoned-cart')
  async triggerAbandonedCart(@CurrentUser() user: AuthUser) {
    return this.marketing.triggerAbandonedCart(user.id);
  }

  // ─── Analytics ──────────────────────────────────────────────

  @Post('analytics/track')
  async trackEvent(
    @Body() body: { event: string; productId?: string; metadata?: Record<string, unknown> },
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.analytics.trackEvent(body.event, user?.id, body.productId, body.metadata);
  }

  @Get('analytics/growth')
  async getGrowthMetrics(@Query() query: AnalyticsQueryDto) {
    return this.analytics.getGrowthMetrics(query.from, query.to);
  }

  @Get('analytics/retention')
  async getRetention(@Query('days') days?: string) {
    return this.analytics.getRetentionMetrics(parseInt(days || '90'));
  }

  @Get('analytics/funnel')
  async getFunnel(@Query() query: AnalyticsQueryDto) {
    return this.analytics.getFunnelAnalysis(query.from, query.to);
  }

  @Get('analytics/revenue')
  async getRevenueAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analytics.getRevenueAnalytics(query.from, query.to, query.period || 'day');
  }

  @Get('analytics/cohorts')
  async getCohorts(@Query('days') days?: string) {
    return this.analytics.getCohortAnalysis(parseInt(days || '90'));
  }

  @Get('analytics/traffic-sources')
  async getTrafficSources(@Query() query: AnalyticsQueryDto) {
    return this.analytics.getTrafficSources(query.from, query.to);
  }

  // ─── A/B Testing ────────────────────────────────────────────

  @Get('experiments')
  async getExperiments() {
    return this.abTesting.getExperiments();
  }

  @Post('experiments')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  async createExperiment(@Body() dto: CreateExperimentDto) {
    return this.abTesting.createExperiment(dto as any);
  }

  @Get('experiments/:key')
  async getExperiment(@Param('key') key: string) {
    return this.abTesting.getExperiment(key);
  }

  @Get('experiments/:key/results')
  async getExperimentResults(@Param('key') key: string) {
    return this.abTesting.getResults(key);
  }

  @Post('experiments/:key/assign')
  async assignVariant(@CurrentUser() user: AuthUser, @Param('key') key: string) {
    return { variant: await this.abTesting.assignVariant(user.id, key) };
  }

  @Post('experiments/:key/convert')
  async trackConversion(@Param('key') key: string, @Body() body: { variant: string }) {
    await this.abTesting.trackConversion(key, body.variant);
    return { ok: true };
  }

  @Patch('experiments/:key/toggle')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  async toggleExperiment(@Param('key') key: string, @Body() body: { enabled: boolean }) {
    return this.abTesting.toggleExperiment(key, body.enabled);
  }
}
