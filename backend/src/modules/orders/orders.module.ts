import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CartModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
