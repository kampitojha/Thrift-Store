import { IsOptional, IsString, IsInt, IsBoolean, IsArray, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RecommendationQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() strategy?: 'trending' | 'popular' | 'personalized' | 'similar' | 'related' | 'new-arrivals' | 'best-sellers';
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() excludeId?: string;
}

export class PersonalizedFeedDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsString({ each: true }) sections?: string[];
}

export class LoyaltyEarnDto {
  @IsString() action!: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() description?: string;
}

export class RedeemPointsDto {
  @IsInt() @Min(1) points!: number;
  @IsString() rewardType!: string;
  @IsOptional() @IsString() reference?: string;
}

export class ReferralCreateDto {
  @IsOptional() @IsString() code?: string;
}

export class ReferralApplyDto {
  @IsString() code!: string;
}

export class CreateCampaignDto {
  @IsString() name!: string;
  @IsString() type!: 'welcome' | 'abandoned_cart' | 'price_drop' | 'review_reminder' | 'wishlist_reminder' | 'reactivation' | 'birthday' | 'festival' | 'weekly_digest' | 'general';
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() trigger?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) segments?: string[];
  @IsOptional() @IsInt() delayHours?: number;
  @IsOptional() channel?: 'email' | 'push' | 'sms' | 'whatsapp';
  @IsOptional() template?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) segments?: string[];
  @IsOptional() @IsInt() delayHours?: number;
  @IsOptional() channel?: 'email' | 'push' | 'sms' | 'whatsapp';
  @IsOptional() template?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateExperimentDto {
  @IsString() name!: string;
  @IsString() description?: string;
  @IsString() metric!: string;
  @IsArray() variants!: Array<{ name: string; config: Record<string, unknown>; trafficPct: number }>;
  @IsOptional() @IsString() hypothesis?: string;
  @IsOptional() @IsInt() @Min(1) maxUsers?: number;
}

export class AnalyticsQueryDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  @IsOptional() @IsString() segment?: string;
  @IsOptional() @IsString() category?: string;
}
