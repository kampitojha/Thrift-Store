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
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly config: ConfigService,
  ) {}

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

    // Validate stock & status
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

    const shippingPaise = 0; // calculated by shipping module later
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

      // Decrement stock / mark sold for qty 1 thrift items
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

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    this.logger.log(`Order ${order.orderNumber} created for buyer ${buyerId}`);
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
      // Credit seller wallets
      for (const item of order.items) {
        await this.creditSeller(item.sellerId, item.sellerEarningPaise, order.id);
      }
    }

    if (status === 'CANCELLED') {
      // Restore stock
      for (const item of order.items) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: { increment: item.quantity },
            status: 'ACTIVE',
          },
        });
      }
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
