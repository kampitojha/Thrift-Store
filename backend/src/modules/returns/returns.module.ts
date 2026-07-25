import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [NotificationsModule, PaymentsModule, WalletModule],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
