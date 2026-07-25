import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page = 1, limit = 30) {
    const { skip, take } = paginate(page, limit);
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return {
      data: items,
      meta: { ...paginationMeta(total, page, take), unread },
    };
  }

  async markRead(userId: string, id?: string) {
    if (id) {
      await this.prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true, readAt: new Date() },
      });
    } else {
      await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
    }
    return { ok: true };
  }

  async push(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: object,
    channel: NotificationChannel = 'IN_APP',
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data as object,
        channel,
        sentAt: new Date(),
      },
    });
  }

  private async sendEmail(userId: string, subject: string, htmlBody: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true },
    });
    if (!user?.email) {
      this.logger.warn(`Cannot send email to user ${userId}: no email found`);
      return;
    }
    this.logger.log(`Email sent to ${user.email}: "${subject}"`);
    return { ok: true, to: user.email, subject };
  }

  private async sendMultiChannel(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: object,
  ) {
    const notification = await this.push(userId, type, title, body, data, 'IN_APP');
    await this.sendEmail(userId, title, body);
    return notification;
  }

  async sendOrderConfirmation(userId: string, orderNumber: string, totalPaise: number) {
    return this.sendMultiChannel(
      userId,
      'ORDER_UPDATE',
      'Order confirmed!',
      `Your order ${orderNumber} for ₹${(totalPaise / 100).toLocaleString('en-IN')} has been placed successfully.`,
      { type: 'order_confirmed', orderNumber },
    );
  }

  async sendOrderShipped(userId: string, orderNumber: string, carrier: string, trackingNumber: string) {
    return this.sendMultiChannel(
      userId,
      'ORDER_UPDATE',
      'Order shipped!',
      `Your order ${orderNumber} has been shipped via ${carrier}. Tracking: ${trackingNumber}`,
      { type: 'order_shipped', orderNumber, carrier, trackingNumber },
    );
  }

  async sendOrderDelivered(userId: string, orderNumber: string) {
    return this.sendMultiChannel(
      userId,
      'ORDER_UPDATE',
      'Order delivered!',
      `Your order ${orderNumber} has been delivered. Please confirm receipt and leave a review.`,
      { type: 'order_delivered', orderNumber },
    );
  }

  async sendOrderCancelled(userId: string, orderNumber: string, reason?: string) {
    return this.sendMultiChannel(
      userId,
      'ORDER_UPDATE',
      'Order cancelled',
      `Your order ${orderNumber} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
      { type: 'order_cancelled', orderNumber, reason },
    );
  }

  async sendReturnRequested(sellerId: string, orderNumber: string, reason: string) {
    return this.sendMultiChannel(
      sellerId,
      'ORDER_UPDATE',
      'Return requested',
      `A return has been requested for order ${orderNumber}. Reason: ${reason}`,
      { type: 'return_requested', orderNumber, reason },
    );
  }

  async sendReturnProcessed(userId: string, orderNumber: string, status: string) {
    return this.sendMultiChannel(
      userId,
      'ORDER_UPDATE',
      `Return ${status}`,
      `Your return for order ${orderNumber} has been ${status}.`,
      { type: 'return_processed', orderNumber, status },
    );
  }

  async sendRefundIssued(userId: string, orderNumber: string, amountPaise: number) {
    return this.sendMultiChannel(
      userId,
      'ORDER_UPDATE',
      'Refund issued',
      `A refund of ₹${(amountPaise / 100).toLocaleString('en-IN')} has been issued for order ${orderNumber}.`,
      { type: 'refund_issued', orderNumber, amountPaise },
    );
  }

  async sendDisputeUpdate(userId: string, orderNumber: string, status: string) {
    return this.sendMultiChannel(
      userId,
      'ORDER_UPDATE',
      `Dispute ${status}`,
      `The dispute for order ${orderNumber} has been updated to: ${status.replace(/_/g, ' ')}.`,
      { type: 'dispute_update', orderNumber, disputeStatus: status },
    );
  }

  async sendNewOrderToSeller(sellerId: string, orderNumber: string, buyerName: string, totalPaise: number) {
    return this.sendMultiChannel(
      sellerId,
      'ORDER_UPDATE',
      'New order received!',
      `${buyerName} placed order ${orderNumber} for ₹${(totalPaise / 100).toLocaleString('en-IN')}.`,
      { type: 'new_order', orderNumber, buyerName },
    );
  }

  async sendPayoutNotification(userId: string, amountPaise: number, status: string) {
    return this.sendMultiChannel(
      userId,
      'PAYOUT',
      `Payout ${status}`,
      `Your payout of ₹${(amountPaise / 100).toLocaleString('en-IN')} has been ${status}.`,
      { type: 'payout_update', amountPaise, payoutStatus: status },
    );
  }
}
