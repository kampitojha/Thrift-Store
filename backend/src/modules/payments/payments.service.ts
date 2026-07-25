import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

let Razorpay: any;
try {
  Razorpay = require('razorpay');
} catch {
  /* noop */
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: any = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const keyId = this.config.get<string>('razorpayKeyId');
    const keySecret = this.config.get<string>('razorpayKeySecret');
    const isValid = keyId && keySecret && !keyId.includes('xxx') && !keySecret.includes('xxx');
    if (Razorpay && isValid) {
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      this.logger.log('Razorpay SDK initialized');
    } else {
      this.logger.warn('Razorpay not configured — using stub mode');
    }
  }

  async createPaymentIntent(
    userId: string,
    orderId: string,
    provider: 'RAZORPAY' | 'STRIPE' | 'COD' | 'WALLET' = 'RAZORPAY',
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: userId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'CANCELLED') throw new BadRequestException('Order cancelled');

    const alreadyPaid = order.payments.some((p) => p.status === 'CAPTURED');
    if (alreadyPaid) throw new BadRequestException('Order already paid');

    if (provider === 'COD') {
      if (!this.config.get('features.cod')) {
        throw new BadRequestException('COD not available');
      }
      const payment = await this.prisma.payment.create({
        data: {
          orderId,
          provider: 'COD',
          method: 'COD',
          status: 'PENDING',
          amountPaise: order.totalPaise,
          providerPaymentId: `cod_${randomUUID()}`,
        },
      });
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          timeline: {
            create: { status: 'CONFIRMED', note: 'COD order confirmed', actorId: userId },
          },
        },
      });
      return { payment, clientSecret: null, provider: 'COD' };
    }

    if (provider === 'WALLET') {
      return this.payWithWallet(userId, order);
    }

    if (this.razorpay) {
      let razorpayOrder: any;
      try {
        razorpayOrder = await this.razorpay.orders.create({
          amount: order.totalPaise,
          currency: order.currency || 'INR',
          receipt: `rct_${order.id.slice(0, 12)}`,
          notes: { orderId: order.id, userId },
          payment_capture: 1,
        });
      } catch (e: any) {
        this.logger.error(`Razorpay order creation failed: ${e.message}`);
        throw new BadRequestException('Payment gateway error. Please try again.');
      }

      const payment = await this.prisma.payment.create({
        data: {
          orderId,
          provider: 'RAZORPAY',
          method: 'UPI',
          status: 'PENDING',
          amountPaise: order.totalPaise,
          providerOrderId: razorpayOrder.id,
          providerResponse: razorpayOrder,
        },
      });

      return {
        payment,
        provider: 'RAZORPAY',
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: this.config.get<string>('razorpayKeyId'),
        amountPaise: order.totalPaise,
        currency: order.currency || 'INR',
        prefill: { contact: '', email: '' },
        orderId: order.id,
      };
    }

    // Stub mode — no Razorpay SDK configured
    const providerOrderId = `order_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        provider,
        method: 'UPI',
        status: 'PENDING',
        amountPaise: order.totalPaise,
        providerOrderId,
      },
    });

    return {
      payment,
      provider,
      razorpayOrderId: providerOrderId,
      razorpayKeyId: this.config.get<string>('razorpayKeyId') || 'rzp_test_xxxx',
      amountPaise: order.totalPaise,
      currency: order.currency || 'INR',
      orderId: order.id,
    };
  }

  async verifyPayment(
    userId: string,
    orderId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: userId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, providerOrderId: razorpayOrderId },
    });
    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.status === 'CAPTURED') return { verified: true, payment };

    const secret = this.config.get<string>('razorpayKeySecret');
    if (secret) {
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expected = createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      if (expected !== razorpaySignature) {
        throw new BadRequestException('Invalid payment signature');
      }
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'CAPTURED',
        providerPaymentId: razorpayPaymentId,
        paidAt: new Date(),
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        timeline: {
          create: { status: 'CONFIRMED', note: 'Payment verified', actorId: userId },
        },
      },
    });

    return { verified: true, payment: { ...payment, status: 'CAPTURED' } };
  }

  async handleRazorpayWebhook(body: Record<string, unknown>, signature: string) {
    const secret = this.config.get<string>('razorpayWebhookSecret');
    if (secret) {
      const expected = createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');
      if (expected !== signature) {
        this.logger.warn('Invalid Razorpay webhook signature');
        throw new BadRequestException('Invalid signature');
      }
    }

    const event = body.event as string;
    const payload = body.payload as any;
    const entity = payload?.payment?.entity;

    if (event === 'payment.captured' && entity) {
      const providerPaymentId = entity.id as string;
      const providerOrderId = entity.order_id as string;

      const payment = await this.prisma.payment.findFirst({
        where: {
          OR: [{ providerOrderId }, { providerPaymentId }],
        },
      });

      if (payment && payment.status !== 'CAPTURED') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            providerPaymentId,
            paidAt: new Date(),
            providerResponse: entity as object,
          },
        });
        await this.prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            timeline: {
              create: { status: 'CONFIRMED', note: 'Payment captured via webhook' },
            },
          },
        });
      }
    }

    if (event === 'payment.failed' && entity) {
      const providerOrderId = entity.order_id as string;
      const payment = await this.prisma.payment.findFirst({
        where: { providerOrderId },
      });
      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: (entity as any).error_description || 'Payment failed',
            providerResponse: entity as object,
          },
        });
      }
    }

    return { received: true };
  }

  async refund(orderId: string, amountPaise?: number, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: { where: { status: 'CAPTURED' }, take: 1 } },
    });
    if (!order) throw new NotFoundException();
    const payment = order.payments[0];
    if (!payment) throw new BadRequestException('No captured payment');

    const refundAmount = amountPaise ?? payment.amountPaise;

    if (this.razorpay && payment.providerPaymentId) {
      try {
        const rzRefund = await this.razorpay.payments.refund(payment.providerPaymentId, {
          amount: refundAmount,
          notes: { reason: reason || '' },
        });
        this.logger.log(`Razorpay refund: ${rzRefund.id}`);
      } catch (e: any) {
        this.logger.error(`Razorpay refund failed: ${e.message}`);
      }
    }

    const refund = await this.prisma.refund.create({
      data: {
        orderId,
        paymentId: payment.id,
        amountPaise: refundAmount,
        reason,
        status: 'REFUNDED',
        processedAt: new Date(),
      },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: refundAmount >= payment.amountPaise ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
    });
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
        timeline: {
          create: { status: 'REFUNDED', note: reason || 'Refund processed' },
        },
      },
    });

    return refund;
  }

  private async payWithWallet(userId: string, order: { id: string; totalPaise: number }) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balancePaise < BigInt(order.totalPaise)) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const newBalance = wallet.balancePaise - BigInt(order.totalPaise);
    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balancePaise: newBalance },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amountPaise: BigInt(order.totalPaise),
          balanceAfter: newBalance,
          reference: order.id,
          description: 'Order payment',
        },
      }),
      this.prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'WALLET',
          method: 'WALLET',
          status: 'CAPTURED',
          amountPaise: order.totalPaise,
          paidAt: new Date(),
          providerPaymentId: `wallet_${randomUUID()}`,
        },
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          timeline: {
            create: { status: 'CONFIRMED', note: 'Paid via wallet', actorId: userId },
          },
        },
      }),
    ]);

    return { provider: 'WALLET', paid: true, orderId: order.id };
  }
}
