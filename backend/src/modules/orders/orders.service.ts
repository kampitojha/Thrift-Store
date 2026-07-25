import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';
import { calcCommission, calcSellerEarning } from '../../common/utils/money';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { NotificationsService } from '../notifications/notifications.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
  CANCELLED: [],
  REPLACEMENT: ['SHIPPED'],
};

const CANCELLATION_WINDOW_HOURS = 24;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  private assertValidTransition(from: string, to: string) {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition order from ${from} to ${to}. Allowed: ${(allowed || []).join(', ') || 'none'}`,
      );
    }
  }

  async createFromCart(
    buyerId: string,
    opts: {
      shippingAddressId: string;
      billingAddressId?: string;
      shippingMethod?: string;
      couponCode?: string;
      notes?: string;
    },
  ) {
    const cart = await this.cart.getCart(buyerId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const address = await this.prisma.address.findFirst({
      where: { id: opts.shippingAddressId, userId: buyerId },
    });
    if (!address) throw new BadRequestException('Invalid shipping address');

    for (const item of cart.items) {
      if (item.product.status !== 'ACTIVE') {
        throw new BadRequestException(`${item.product.title} is no longer available`);
      }
      if (item.product.quantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.product.title}`);
      }
    }

    const commissionBps = this.config.get<number>('platformCommissionBps') || 1000;
    let subtotalPaise = cart.subtotalPaise;
    let discountPaise = 0;
    let couponId: string | undefined;
    let couponCode: string | undefined;

    if (opts.couponCode) {
      const coupon = await this.validateCoupon(opts.couponCode, buyerId, subtotalPaise);
      if (coupon) {
        discountPaise = coupon.discountPaise;
        couponId = coupon.id;
        couponCode = coupon.code;
      }
    }

    const shippingPaise = 0;
    const taxPaise = 0;
    const totalPaise = Math.max(0, subtotalPaise - discountPaise + shippingPaise + taxPaise);
    const orderNumber = this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          buyerId,
          status: 'PLACED',
          subtotalPaise,
          shippingPaise,
          taxPaise,
          discountPaise,
          totalPaise,
          platformFeePaise: calcCommission(subtotalPaise, commissionBps),
          shippingAddressId: opts.shippingAddressId,
          billingAddressId: opts.billingAddressId || opts.shippingAddressId,
          shippingMethod: (opts.shippingMethod as never) || 'STANDARD',
          couponId,
          couponCode,
          notes: opts.notes,
          items: {
            create: cart.items.map((item) => {
              const lineTotal = item.product.pricePaise * item.quantity;
              return {
                productId: item.productId,
                sellerId: item.product.seller.id,
                title: item.product.title,
                thumbnailUrl: item.product.thumbnailUrl,
                quantity: item.quantity,
                unitPricePaise: item.product.pricePaise,
                totalPaise: lineTotal,
                commissionPaise: calcCommission(lineTotal, commissionBps),
                sellerEarningPaise: calcSellerEarning(lineTotal, commissionBps),
                status: 'PLACED',
              };
            }),
          },
          timeline: {
            create: { status: 'PLACED', note: 'Order placed', actorId: buyerId },
          },
        },
        include: { items: true },
      });

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: { decrement: item.quantity },
            status: item.product.quantity <= item.quantity ? 'RESERVED' : undefined,
          },
        });
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    this.logger.log(`Order ${order.orderNumber} created for buyer ${buyerId}`);

    await this.notifications.sendOrderConfirmation(buyerId, order.orderNumber, order.totalPaise);
    for (const item of order.items) {
      const seller = await this.prisma.user.findUnique({ where: { id: item.sellerId } });
      await this.notifications.sendNewOrderToSeller(
        item.sellerId,
        order.orderNumber,
        seller?.displayName || seller?.username || 'A buyer',
        order.totalPaise,
      );
    }

    return order;
  }

  async findBuyerOrders(buyerId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { buyerId };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          payments: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async findSellerOrders(sellerId: string, page = 1, limit = 20, status?: string) {
    const { skip, take } = paginate(page, limit);
    const where: Prisma.OrderWhereInput = {
      items: { some: { sellerId } },
      ...(status ? { status: status as OrderStatus } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { where: { sellerId } },
          buyer: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async findOne(orderId: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
        shipments: true,
        timeline: { orderBy: { createdAt: 'asc' } },
        shippingAddress: true,
        invoices: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isBuyer = order.buyerId === userId;
    const isSeller = order.items.some((i) => i.sellerId === userId);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(role);

    if (!isBuyer && !isSeller && !isAdmin) throw new ForbiddenException();
    return order;
  }

  async updateStatus(
    orderId: string,
    actorId: string,
    status: OrderStatus,
    note?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException();

    const isSeller = order.items.some((i) => i.sellerId === actorId);
    if (!isSeller) throw new ForbiddenException();

    this.assertValidTransition(order.status, status);

    const timestamps: Partial<Record<OrderStatus, keyof typeof order>> = {
      CONFIRMED: 'confirmedAt',
      PACKED: 'packedAt',
      SHIPPED: 'shippedAt',
      DELIVERED: 'deliveredAt',
      CANCELLED: 'cancelledAt',
    };

    const data: Prisma.OrderUpdateInput = {
      status,
      timeline: {
        create: { status, note, actorId },
      },
    };

    const tsField = timestamps[status];
    if (tsField) {
      (data as Record<string, unknown>)[tsField as string] = new Date();
    }

    if (status === 'DELIVERED') {
      for (const item of order.items) {
        await this.creditSeller(item.sellerId, item.sellerEarningPaise, order.id);
      }
      await this.notifications.sendOrderDelivered(order.buyerId, order.orderNumber);
    }

    if (status === 'CANCELLED') {
      for (const item of order.items) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: { increment: item.quantity },
            status: 'ACTIVE',
          },
        });
      }
      await this.notifications.sendOrderCancelled(order.buyerId, order.orderNumber, note);
    }

    if (status === 'CONFIRMED') {
      for (const item of order.items) {
        await this.notifications.sendOrderConfirmation(
          order.buyerId,
          order.orderNumber,
          order.totalPaise,
        );
      }
    }

    if (status === 'SHIPPED') {
      const shipment = await this.prisma.shipment.findFirst({ where: { orderId } });
      await this.notifications.sendOrderShipped(
        order.buyerId,
        order.orderNumber,
        shipment?.carrier || 'carrier',
        shipment?.trackingNumber || '',
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data,
      include: { timeline: true, items: true },
    });
  }

  private async creditSeller(sellerId: string, amountPaise: number, orderId: string) {
    const wallet = await this.prisma.wallet.upsert({
      where: { userId: sellerId },
      create: { userId: sellerId, balancePaise: BigInt(amountPaise) },
      update: { balancePaise: { increment: BigInt(amountPaise) } },
    });

    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        amountPaise: BigInt(amountPaise),
        balanceAfter: wallet.balancePaise,
        reference: orderId,
        description: 'Order earnings',
      },
    });
  }

  async sellerAction(userId: string, orderId: string, status: string, note?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, items: { some: { sellerId: userId } } },
      include: { items: { where: { sellerId: userId } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    this.assertValidTransition(order.status, status);

    if (status === 'DELIVERED') {
      for (const item of order.items) {
        await this.creditSeller(item.sellerId, item.sellerEarningPaise, order.id);
      }
      await this.notifications.sendOrderDelivered(order.buyerId, order.orderNumber);
    }

    if (status === 'CANCELLED') {
      for (const item of order.items) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity }, status: 'ACTIVE' },
        });
      }
      await this.notifications.sendOrderCancelled(order.buyerId, order.orderNumber, note);
    }

    if (status === 'SHIPPED') {
      const shipment = await this.prisma.shipment.findFirst({ where: { orderId } });
      await this.notifications.sendOrderShipped(
        order.buyerId,
        order.orderNumber,
        shipment?.carrier || 'carrier',
        shipment?.trackingNumber || '',
      );
    }

    const statusField: Record<string, string> = {
      CONFIRMED: 'confirmedAt', PACKED: 'packedAt', SHIPPED: 'shippedAt',
      DELIVERED: 'deliveredAt', CANCELLED: 'cancelledAt',
    };

    const updateData: Record<string, unknown> = { status };
    if (statusField[status]) updateData[statusField[status]] = new Date();

    await this.prisma.order.update({ where: { id: orderId }, data: updateData as any });
    await this.prisma.orderTimeline.create({
      data: { orderId, status: status as any, note: note || `Status: ${status}` },
    });

    return { ok: true, status };
  }

  async addTimelineNote(userId: string, orderId: string, note: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, items: { some: { sellerId: userId } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.orderTimeline.create({
      data: { orderId, status: order.status as any, note },
    });
  }

  async getTimeline(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, items: { some: { sellerId: userId } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.orderTimeline.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getInvoice(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, OR: [{ buyerId: userId }, { items: { some: { sellerId: userId } } }] },
      include: {
        items: { include: { product: { select: { title: true, slug: true, pricePaise: true, condition: true } } } },
        shippingAddress: true,
        billingAddress: true,
        buyer: { select: { username: true, displayName: true, email: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        shipments: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async buyerCancel(orderId: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const hoursSinceCreation = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > CANCELLATION_WINDOW_HOURS && order.status === 'CONFIRMED') {
      throw new BadRequestException(
        `Cancellation window of ${CANCELLATION_WINDOW_HOURS} hours has passed. Please contact the seller.`,
      );
    }

    const cancellable = ['PLACED', 'CONFIRMED'];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException('Order can no longer be cancelled');
    }

    this.assertValidTransition(order.status, 'CANCELLED');

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason,
          timeline: { create: { status: 'CANCELLED', note: reason || 'Cancelled by buyer', actorId: userId } },
        },
      });
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity }, status: 'ACTIVE' },
        });
      }
    });

    await this.notifications.sendOrderCancelled(order.buyerId, order.orderNumber, reason);

    return { ok: true, status: 'CANCELLED' };
  }

  async searchBuyerOrders(
    buyerId: string,
    opts: { q?: string; status?: string; from?: string; to?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; page?: number; limit?: number },
  ) {
    const { skip, take } = paginate(opts.page || 1, opts.limit || 20);
    const where: Prisma.OrderWhereInput = { buyerId };

    if (opts.status) where.status = opts.status as OrderStatus;
    if (opts.q) {
      where.OR = [
        { orderNumber: { contains: opts.q, mode: 'insensitive' } },
        { items: { some: { title: { contains: opts.q, mode: 'insensitive' } } } },
      ];
    }
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from);
      if (opts.to) where.createdAt.lte = new Date(opts.to);
    }

    const orderBy: Prisma.OrderOrderByWithRelationInput = {};
    if (opts.sortBy === 'total') orderBy.totalPaise = opts.sortOrder || 'desc';
    else if (opts.sortBy === 'status') orderBy.status = opts.sortOrder || 'asc';
    else orderBy.createdAt = opts.sortOrder || 'desc';

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip, take, orderBy,
        include: { items: { take: 3 }, payments: { take: 1, orderBy: { createdAt: 'desc' } }, shipments: { take: 1 } },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, opts.page || 1, take) };
  }

  async reorder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    for (const item of order.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, status: 'ACTIVE', deletedAt: null },
      });
      if (!product) continue;

      const existing = await this.prisma.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
      });
      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + 1 },
        });
      } else {
        await this.prisma.cartItem.create({
          data: { cartId: cart.id, productId: item.productId, quantity: 1, pricePaise: product.pricePaise },
        });
      }
    }

    return { ok: true, message: 'Items added to cart' };
  }

  async getOrderAnalytics(sellerId: string) {
    const where = { items: { some: { sellerId } } };
    const [totalOrders, byStatus, revenue, cancelled, returned] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.order.aggregate({ where: { ...where, status: 'DELIVERED' }, _sum: { totalPaise: true } }),
      this.prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.order.count({ where: { ...where, status: { in: ['RETURNED', 'REFUNDED'] } } }),
    ]);

    return {
      totalOrders,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {} as Record<string, number>),
      revenue: revenue._sum.totalPaise || 0,
      cancelled,
      returned,
      cancellationRate: totalOrders > 0 ? (cancelled / totalOrders) * 100 : 0,
      returnRate: totalOrders > 0 ? (returned / totalOrders) * 100 : 0,
    };
  }

  private async validateCoupon(code: string, userId: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) return null;
    const now = new Date();
    if (now < coupon.startsAt || now > coupon.endsAt) return null;
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return null;
    if (coupon.minOrderPaise && subtotal < coupon.minOrderPaise) return null;

    let discountPaise = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountPaise = Math.floor((subtotal * coupon.value) / 100);
      if (coupon.maxDiscountPaise) {
        discountPaise = Math.min(discountPaise, coupon.maxDiscountPaise);
      }
    } else if (coupon.type === 'FIXED') {
      discountPaise = coupon.value;
    }

    return { id: coupon.id, code: coupon.code, discountPaise };
  }

  private generateOrderNumber() {
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `RLM-${date}-${rand}`;
  }
}
