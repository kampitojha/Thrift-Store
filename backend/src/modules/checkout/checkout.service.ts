import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { CouponsService } from '../coupons/coupons.service';
import { ShippingService } from '../shipping/shipping.service';
import { PaymentsService } from '../payments/payments.service';
import { ConfigService } from '@nestjs/config';
import { calcCommission, calcSellerEarning } from '../../common/utils/money';
import { randomUUID } from 'crypto';

export interface CheckoutSession {
  userId: string;
  cartId: string;
  shippingAddressId?: string;
  billingAddressId?: string;
  shippingMethod?: string;
  couponCode?: string;
  notes?: string;
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  discountPaise: number;
  platformFeePaise: number;
  totalPaise: number;
  estimatedDelivery?: { minDays: number; maxDays: number };
  validationErrors: string[];
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly coupons: CouponsService,
    private readonly shipping: ShippingService,
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  async initSession(userId: string): Promise<CheckoutSession> {
    const cartData = await this.cart.getCart(userId);
    if (!cartData.items.length) throw new BadRequestException('Cart is empty');

    const validationErrors: string[] = [];
    for (const item of cartData.items) {
      if (item.product.status !== 'ACTIVE') validationErrors.push(`${item.product.title} is no longer available`);
      else if (item.product.quantity < item.quantity) validationErrors.push(`Insufficient stock for ${item.product.title}`);
    }

    const commissionBps = this.config.get<number>('platformCommissionBps') || 1000;
    const subtotalPaise = cartData.subtotalPaise;
    const platformFeePaise = calcCommission(subtotalPaise, commissionBps);

    return {
      userId,
      cartId: cartData.id,
      subtotalPaise,
      shippingPaise: 0,
      taxPaise: 0,
      discountPaise: 0,
      platformFeePaise,
      totalPaise: subtotalPaise + platformFeePaise,
      validationErrors,
    };
  }

  async estimateShipping(
    userId: string,
    shippingAddressId: string,
    shippingMethod?: string,
  ): Promise<Partial<CheckoutSession>> {
    const cartData = await this.cart.getCart(userId);
    if (!cartData.items.length) throw new BadRequestException('Cart is empty');

    const address = await this.prisma.address.findFirst({
      where: { id: shippingAddressId, userId },
    });
    if (!address) throw new BadRequestException('Invalid shipping address');

    const firstItem = cartData.items[0];
    const originCity = (firstItem.product as any).city || 'Mumbai';
    const originState = (firstItem.product as any).state || 'Maharashtra';
    const originPincode = (firstItem.product as any).location || '400001';

    const rates = await this.shipping.rateShipment(
      firstItem.product.seller.id,
      (firstItem.product as any).shippingWeightG || 500,
      originPincode,
      address.postalCode,
      shippingMethod,
    );

    const shippingPaise = rates.length > 0 ? rates[0].ratePaise : 0;
    const estimate = await this.shipping.getDeliveryEstimate(
      originCity, originState, originPincode,
      address.city, address.state, address.postalCode,
      shippingMethod,
    );

    return {
      shippingAddressId,
      shippingPaise,
      shippingMethod: shippingMethod || 'STANDARD',
      estimatedDelivery: { minDays: estimate.minDays, maxDays: estimate.maxDays },
    };
  }

  async applyCoupon(userId: string, code: string, subtotalPaise: number): Promise<{ discountPaise: number; couponCode: string }> {
    const coupon = await this.coupons.validateCoupon(code, subtotalPaise);
    if (!coupon) throw new BadRequestException('Invalid or expired coupon');

    return { discountPaise: coupon.discountPaise, couponCode: code.toUpperCase() };
  }

  async computeTotals(session: CheckoutSession): Promise<CheckoutSession> {
    const totalPaise = Math.max(0, session.subtotalPaise - session.discountPaise + session.shippingPaise + session.taxPaise + session.platformFeePaise);
    return { ...session, totalPaise };
  }

  async placeOrder(
    userId: string,
    session: CheckoutSession,
  ): Promise<{ orderId: string; orderNumber: string; totalPaise: number }> {
    const cartData = await this.cart.getCart(userId);
    if (!cartData.items.length) throw new BadRequestException('Cart is empty');
    if (!session.shippingAddressId) throw new BadRequestException('Shipping address required');

    const commissionBps = this.config.get<number>('platformCommissionBps') || 1000;
    const orderNumber = this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          buyerId: userId,
          status: 'PLACED',
          subtotalPaise: session.subtotalPaise,
          shippingPaise: session.shippingPaise,
          taxPaise: session.taxPaise,
          discountPaise: session.discountPaise,
          totalPaise: session.totalPaise,
          platformFeePaise: session.platformFeePaise,
          shippingAddressId: session.shippingAddressId,
          billingAddressId: session.billingAddressId || session.shippingAddressId,
          shippingMethod: (session.shippingMethod as never) || 'STANDARD',
          couponCode: session.couponCode,
          notes: session.notes,
          items: {
            create: cartData.items.map((item) => {
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
            create: { status: 'PLACED', note: 'Order placed', actorId: userId },
          },
        },
        include: { items: true },
      });

      for (const item of cartData.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: { decrement: item.quantity },
            status: item.product.quantity <= item.quantity ? 'RESERVED' : undefined,
          },
        });
      }

      if (session.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: session.couponCode } });
        if (coupon) {
          await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
        }
      }

      await tx.cartItem.deleteMany({ where: { cartId: cartData.id } });

      return created;
    });

    this.logger.log(`Order ${order.orderNumber} placed for buyer ${userId}`);
    return { orderId: order.id, orderNumber: order.orderNumber, totalPaise: order.totalPaise };
  }

  private generateOrderNumber(): string {
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `RLM-${date}-${rand}`;
  }
}
