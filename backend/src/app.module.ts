import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import appConfig from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './config/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CartModule } from './modules/cart/cart.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { OffersModule } from './modules/offers/offers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { SearchModule } from './modules/search/search.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { CmsModule } from './modules/cms/cms.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { HealthModule } from './modules/health/health.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { TwoFactorModule } from './modules/two-factor/two-factor.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { EventsModule } from './modules/events/events.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { SavedSearchesModule } from './modules/saved-searches/saved-searches.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { BrandsAdminModule } from './modules/brands/brands-admin.module';
import { SupportModule } from './modules/support/support.module';
import { GiftCardsModule } from './modules/gift-cards/gift-cards.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    PaymentsModule,
    CartModule,
    WishlistModule,
    ReviewsModule,
    MessagingModule,
    OffersModule,
    NotificationsModule,
    WalletModule,
    SellersModule,
    SearchModule,
    AiModule,
    AdminModule,
    CmsModule,
    UploadsModule,
    SessionsModule,
    TwoFactorModule,
    CouponsModule,
    ShippingModule,
    ReportsModule,
    ReturnsModule,
    DisputesModule,
    AddressesModule,
    CheckoutModule,
    InvoicesModule,
    PayoutsModule,
    RefundsModule,
    EventsModule,
    CollectionsModule,
    SavedSearchesModule,
    FeatureFlagsModule,
    BrandsAdminModule,
    SupportModule,
    GiftCardsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
