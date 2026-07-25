import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(orderId: string, gstin?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
        buyer: { select: { username: true, displayName: true, email: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        shipments: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const invoiceNumber = this.generateInvoiceNumber(order.orderNumber);
    const taxPaise = order.taxPaise || 0;

    const invoice = await this.prisma.invoice.create({
      data: {
        orderId,
        invoiceNumber,
        gstin: gstin || '',
        amountPaise: order.totalPaise,
        taxPaise,
        meta: {
          subtotalPaise: order.subtotalPaise,
          shippingPaise: order.shippingPaise,
          discountPaise: order.discountPaise,
          platformFeePaise: order.platformFeePaise,
          items: order.items.map((i) => ({
            title: i.title,
            quantity: i.quantity,
            unitPricePaise: i.unitPricePaise,
            totalPaise: i.totalPaise,
          })),
          billingAddress: order.billingAddress || order.shippingAddress,
          shippingAddress: order.shippingAddress,
          buyer: { username: order.buyer.username, displayName: order.buyer.displayName, email: order.buyer.email },
          payment: order.payments[0] || null,
          shipment: order.shipments[0] || null,
        },
        issuedAt: new Date(),
      },
    });

    this.logger.log(`Invoice ${invoiceNumber} generated for order ${order.orderNumber}`);
    return invoice;
  }

  async findByOrder(orderId: string) {
    return this.prisma.invoice.findMany({
      where: { orderId },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOne(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { order: { select: { orderNumber: true, status: true, createdAt: true, buyerId: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async myInvoices(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { order: { buyerId: userId } };
    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip, take,
        orderBy: { issuedAt: 'desc' },
        include: { order: { select: { orderNumber: true, status: true, totalPaise: true, createdAt: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async sellerInvoices(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { order: { items: { some: { sellerId: userId } } } };
    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip, take,
        orderBy: { issuedAt: 'desc' },
        include: { order: { select: { orderNumber: true, status: true, totalPaise: true, createdAt: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  private generateInvoiceNumber(orderNumber: string): string {
    const seq = Date.now().toString(36).slice(-6).toUpperCase();
    return `INV-${orderNumber.slice(-10)}-${seq}`;
  }
}
