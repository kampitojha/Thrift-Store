import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByOrder(orderId: string) {
    return this.prisma.refund.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(refundId: string) {
    return this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { order: { select: { orderNumber: true, totalPaise: true } } },
    });
  }

  async myRefunds(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { order: { buyerId: userId } };
    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true, totalPaise: true, status: true } } },
      }),
      this.prisma.refund.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async sellerRefunds(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { order: { items: { some: { sellerId: userId } } } };
    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true, totalPaise: true, status: true } } },
      }),
      this.prisma.refund.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async adminList(page = 1, limit = 20, status?: string) {
    const { skip, take } = paginate(page, limit);
    const where = status ? { status: status as any } : {};
    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true, totalPaise: true, status: true } } },
      }),
      this.prisma.refund.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async getSummary() {
    const [totalRefunds, totalAmount, pending] = await Promise.all([
      this.prisma.refund.count(),
      this.prisma.refund.aggregate({ _sum: { amountPaise: true } }),
      this.prisma.refund.count({ where: { status: 'PENDING' } }),
    ]);
    return { totalRefunds, totalAmountPaise: totalAmount._sum.amountPaise || BigInt(0), pending };
  }
}
