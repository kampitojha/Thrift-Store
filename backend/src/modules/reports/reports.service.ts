import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertSeller(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    return seller;
  }

  async salesReport(userId: string, from?: string, to?: string) {
    await this.assertSeller(userId);
    const where: any = { sellerId: userId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const items = await this.prisma.orderItem.findMany({
      where,
      include: {
        order: { select: { orderNumber: true, createdAt: true, status: true } },
        product: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Order Number,Product,Quantity,Unit Price,Seller Earning,Commission,Status,Date\n';
    const rows = items.map((i) =>
      [
        i.order.orderNumber,
        `"${i.product.title}"`,
        i.quantity,
        (i.unitPricePaise / 100).toFixed(2),
        (i.sellerEarningPaise / 100).toFixed(2),
        (i.commissionPaise / 100).toFixed(2),
        i.order.status,
        i.createdAt.toISOString().split('T')[0],
      ].join(','),
    ).join('\n');

    return header + rows;
  }

  async inventoryReport(userId: string) {
    await this.assertSeller(userId);
    const products = await this.prisma.product.findMany({
      where: { sellerId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        title: true,
        slug: true,
        pricePaise: true,
        quantity: true,
        status: true,
        condition: true,
        size: true,
        color: true,
        favoriteCount: true,
        viewCount: true,
        createdAt: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    const header = 'Title,Category,Brand,Price,Quantity,Status,Condition,Size,Color,Favorites,Views,Created\n';
    const rows = products.map((p) =>
      [
        `"${p.title}"`,
        p.category?.name || '',
        p.brand?.name || '',
        (p.pricePaise / 100).toFixed(2),
        p.quantity,
        p.status,
        p.condition,
        p.size || '',
        p.color || '',
        p.favoriteCount,
        p.viewCount,
        p.createdAt.toISOString().split('T')[0],
      ].join(','),
    ).join('\n');

    return header + rows;
  }

  async orderReport(userId: string, from?: string, to?: string) {
    await this.assertSeller(userId);
    const where: any = { items: { some: { sellerId: userId } } };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        buyer: { select: { username: true, email: true } },
        items: { where: { sellerId: userId }, include: { product: { select: { title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Order Number,Buyer,Email,Items,Total,Status,Payment,Shipping,Date\n';
    const rows = orders.map((o) =>
      [
        o.orderNumber,
        o.buyer?.username || '',
        o.buyer?.email || '',
        o.items.map((i) => i.product.title).join('; '),
        (o.totalPaise / 100).toFixed(2),
        o.status,
        o.status,
        o.shippingMethod || '',
        o.createdAt.toISOString().split('T')[0],
      ].join(','),
    ).join('\n');

    return header + rows;
  }

  async revenueSummary(userId: string, from?: string, to?: string) {
    await this.assertSeller(userId);
    const where: any = { sellerId: userId, status: 'DELIVERED' };
    if (from || to) {
      where.order = {};
      if (from) where.order.createdAt = { gte: new Date(from) };
      if (to) where.order = { ...where.order, createdAt: { ...(where.order.createdAt || {}), lte: new Date(to) } };
    }

    const aggregation = await this.prisma.orderItem.aggregate({
      where,
      _sum: { totalPaise: true, sellerEarningPaise: true, commissionPaise: true },
      _count: true,
    });

    return {
      totalRevenuePaise: aggregation._sum.totalPaise || 0,
      totalEarningsPaise: aggregation._sum.sellerEarningPaise || 0,
      totalCommissionPaise: aggregation._sum.commissionPaise || 0,
      orderCount: aggregation._count,
    };
  }
}
