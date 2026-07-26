import { Module } from '@nestjs/common';
import { GrowthController } from './growth.controller';
import { RecommendationService } from './services/recommendation.service';
import { PersonalizationService } from './services/personalization.service';
import { LoyaltyService } from './services/loyalty.service';
import { ReferralService } from './services/referral.service';
import { MarketingAutomationService } from './services/marketing-automation.service';
import { GrowthAnalyticsService } from './services/growth-analytics.service';
import { AbTestingService } from './services/ab-testing.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [NotificationsModule, CouponsModule],
  controllers: [GrowthController],
  providers: [
    RecommendationService,
    PersonalizationService,
    LoyaltyService,
    ReferralService,
    MarketingAutomationService,
    GrowthAnalyticsService,
    AbTestingService,
  ],
  exports: [
    RecommendationService,
    PersonalizationService,
    LoyaltyService,
    ReferralService,
    MarketingAutomationService,
    GrowthAnalyticsService,
    AbTestingService,
  ],
})
export class GrowthModule {}
