import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { WalletService } from '../wallet/wallet.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly payments: PaymentsService,
    private readonly wallet: WalletService,
  ) {}

  async requestReturn(userId: string, orderId: string, data: { reason: string; description?: string; evidenceUrls?: string[] }) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: userId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const validStatuses = ['DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY'];
    if (!validStatuses.includes(order.status)) {
      throw new BadRequestException('Order is not eligible for return');
    }

    const daysSinceDelivery = order.deliveredAt
      ? Math.floor((Date.now() - order.deliveredAt.getTime()) / 86400000)
      : 0;

    const policyDays = 7;
    if (daysSinceDelivery > policyDays) {
      throw new BadRequestException(`Return window of ${policyDays} days has passed`);
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'RETURN_REQUESTED',
        timeline: {
          create: {
            status: 'RETURN_REQUESTED',
            note: `Return requested: ${data.reason}`,
            actorId: userId,
            metadata: { reason: data.reason, description: data.description, evidenceUrls: data.evidenceUrls || [] } as any,
          },
        },
      },
    });

    await this.notifications.sendReturnRequested(
      order.items[0]?.sellerId || '',
      order.orderNumber,
      data.reason,
    );

    return { ok: true, status: 'RETURN_REQUESTED' };
  }

  async myReturns(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { buyerId: userId, status: { in: ['RETURN_REQUESTED', 'RETURNED', 'REFUNDED'] as any } };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip, take, orderBy: { updatedAt: 'desc' }, include: { items: true, timeline: { take: 5, orderBy: { createdAt: 'desc' } } } }),
      this.prisma.order.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async sellerReturns(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { items: { some: { sellerId: userId } }, status: { in: ['RETURN_REQUESTED', 'RETURNED', 'REFUNDED'] as any } };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip, take, orderBy: { updatedAt: 'desc' }, include: { items: { where: { sellerId: userId } }, buyer: { select: { id: true, username: true, displayName: true, avatarUrl: true } }, timeline: { take: 5, orderBy: { createdAt: 'desc' } } } }),
      this.prisma.order.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async findOne(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, OR: [{ buyerId: userId }, { items: { some: { sellerId: userId } } }] },
      include: { items: true, timeline: { orderBy: { createdAt: 'desc' } }, buyer: { select: { id: true, username: true, displayName: true, avatarUrl: true, email: true } }, refunds: true },
    });
    if (!order) throw new NotFoundException('Return request not found');
    return order;
  }

  async processReturn(userId: string, id: string, data: { action: 'approve' | 'reject' | 'complete'; note?: string }) {
    const order = await this.prisma.order.findFirst({
      where: { id, items: { some: { sellerId: userId } }, status: 'RETURN_REQUESTED' },
      include: { items: { where: { sellerId: userId } } },
    });
    if (!order) throw new NotFoundException('Return request not found');

    if (data.action === 'approve') {
      await this.prisma.order.update({
        where: { id },
        data: {
          status: 'RETURNED',
          timeline: { create: { status: 'RETURNED', note: data.note || 'Return approved', actorId: userId } },
        },
      });
      await this.notifications.sendReturnProcessed(order.buyerId, order.orderNumber, 'approved');
    }

    if (data.action === 'reject') {
      await this.prisma.order.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          timeline: { create: { status: 'DELIVERED', note: data.note || 'Return rejected', actorId: userId } },
        },
      });
      await this.notifications.sendReturnProcessed(order.buyerId, order.orderNumber, 'rejected');
    }

    if (data.action === 'complete') {
      const refundResult = await this.payments.refund(id, order.totalPaise, 'Return completed');

      for (const item of order.items) {
        await this.wallet.holdAmount(item.sellerId, id, item.sellerEarningPaise);
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: {
            status: 'REFUNDED',
            timeline: { create: { status: 'REFUNDED', note: data.note || 'Return completed - refund issued', actorId: userId } },
          },
        });
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity }, status: 'ACTIVE' },
          });
        }
      });

      await this.notifications.sendRefundIssued(order.buyerId, order.orderNumber, refundResult.amountPaise);
    }

    return { ok: true, status: data.action === 'reject' ? 'DELIVERED' : data.action === 'approve' ? 'RETURNED' : 'REFUNDED' };
  }
}
