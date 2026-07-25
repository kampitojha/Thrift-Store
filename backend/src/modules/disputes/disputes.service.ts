import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async raise(userId: string, data: { orderId: string; reason: string; description?: string; evidenceUrls?: string[] }) {
    const order = await this.prisma.order.findFirst({
      where: { id: data.orderId, buyerId: userId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const existing = await this.prisma.dispute.findFirst({
      where: { orderId: data.orderId, status: { in: ['OPEN', 'UNDER_REVIEW', 'ESCALATED'] } },
    });
    if (existing) throw new BadRequestException('A dispute is already open for this order');

    const dispute = await this.prisma.dispute.create({
      data: {
        orderId: data.orderId,
        raisedById: userId,
        reason: data.reason,
        description: data.description,
        status: 'OPEN',
      },
    });

    await this.prisma.orderTimeline.create({
      data: {
        orderId: data.orderId,
        status: order.status as any,
        note: `Dispute raised: ${data.reason}`,
        actorId: userId,
        metadata: { disputeId: dispute.id, reason: data.reason, description: data.description, evidenceUrls: data.evidenceUrls || [] } as any,
      },
    });

    const sellerId = (await this.prisma.orderItem.findFirst({ where: { orderId: data.orderId } }))?.sellerId;
    if (sellerId) {
      await this.notifications.push(sellerId, 'ORDER_UPDATE',
        'Dispute Raised',
        `A dispute has been raised for order ${order.orderNumber}: ${data.reason}`,
        { orderId: data.orderId, disputeId: dispute.id, type: 'dispute_raised' },
      );
    }

    return dispute;
  }

  async myDisputes(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { raisedById: userId };
    const [items, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { order: { select: { id: true, orderNumber: true, totalPaise: true, status: true, createdAt: true } } },
      }),
      this.prisma.dispute.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async sellerDisputes(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { order: { items: { some: { sellerId: userId } } } };
    const [items, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, orderNumber: true, totalPaise: true, status: true, createdAt: true } },
        },
      }),
      this.prisma.dispute.count({ where }),
    ]);
    const raiderIds = [...new Set(items.map((d) => d.raisedById))];
    const raiders = await this.prisma.user.findMany({
      where: { id: { in: raiderIds } },
      select: { id: true, username: true, displayName: true },
    });
    const raiderMap = new Map(raiders.map((r) => [r.id, r]));
    const enriched = items.map((d) => ({ ...d, raisedBy: raiderMap.get(d.raisedById) || null }));
    return { data: enriched, meta: paginationMeta(total, page, take) };
  }

  async findOne(userId: string, id: string) {
    const dispute = await this.prisma.dispute.findFirst({
      where: {
        id,
        OR: [
          { raisedById: userId },
          { order: { items: { some: { sellerId: userId } } } },
        ],
      },
      include: {
        order: { select: { id: true, orderNumber: true, totalPaise: true, status: true, createdAt: true, buyerId: true } },
      },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    const raider = await this.prisma.user.findUnique({
      where: { id: dispute.raisedById },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    return { ...dispute, raisedBy: raider };
  }

  async resolve(userId: string, id: string, data: { action: string; resolution?: string }) {
    const dispute = await this.prisma.dispute.findFirst({ where: { id } });
    if (!dispute) throw new NotFoundException('Dispute not found');

    const order = await this.prisma.order.findUnique({ where: { id: dispute.orderId }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');

    const isSeller = order.items.some((i) => i.sellerId === userId);
    const isBuyer = order.buyerId === userId;
    const isAdmin = userId.includes('admin');

    if (!isSeller && !isBuyer && !isAdmin) throw new ForbiddenException();

    const statusMap: Record<string, any> = {
      resolve_buyer: 'RESOLVED_BUYER',
      resolve_seller: 'RESOLVED_SELLER',
      escalate: 'ESCALATED',
      close: 'CLOSED',
    };

    const newStatus = statusMap[data.action];
    if (!newStatus) throw new BadRequestException('Invalid action');

    const updated = await this.prisma.dispute.update({
      where: { id },
      data: { status: newStatus, resolution: data.resolution, resolvedAt: data.action === 'close' ? new Date() : undefined },
    });

    await this.notifications.push(
      isSeller ? order.buyerId : (order.items[0]?.sellerId || ''),
      'ORDER_UPDATE',
      'Dispute Updated',
      `Dispute for order ${order.orderNumber}: ${data.resolution || data.action}`,
      { orderId: order.id, disputeId: id, type: 'dispute_update' },
    );

    return updated;
  }

  async addEvidence(userId: string, id: string, data: { urls: string[]; statement?: string }) {
    const dispute = await this.prisma.dispute.findFirst({
      where: { id, OR: [{ raisedById: userId }, { order: { items: { some: { sellerId: userId } } } }] },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');

    await this.prisma.orderTimeline.create({
      data: {
        orderId: dispute.orderId,
        status: 'PLACED' as any,
        note: data.statement || 'Evidence added to dispute',
        actorId: userId,
        metadata: { disputeId: id, evidenceUrls: data.urls, statement: data.statement } as any,
      },
    });

    return { ok: true };
  }
}
