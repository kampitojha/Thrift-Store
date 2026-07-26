import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../config/redis.module';

@Injectable()
export class GrowthAnalyticsService {
  private readonly logger = new Logger(GrowthAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async trackEvent(event: string, userId?: string, productId?: string, metadata?: Record<string, unknown>) {
    const key = `analytics:events:${event}`;
    await this.redis.incr(key, 86400 * 7);

    if (event === 'product_view' && productId) {
      await this.prisma.productView.create({
        data: {
          productId,
          userId,
          sessionId: (metadata?.sessionId as string) || null,
          ipHash: (metadata?.ipHash as string) || null,
        },
      });

      await this.prisma.product.update({
        where: { id: productId },
        data: { viewCount: { increment: 1 } },
      });
    }

    if (event === 'search') {
      const query = metadata?.query as string;
      if (query) {
        await this.redis.client.zincrby('trending:searches', 1, query.toLowerCase());
      }
    }

    return { ok: true };
  }

  async getGrowthMetrics(from?: string, to?: string) {
    const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
    const dateTo = to ? new Date(to) : new Date();
    const prevFrom = new Date(dateFrom.getTime() - (dateTo.getTime() - dateFrom.getTime()));

    const [currentUsers, prevUsers, currentOrders, prevOrders, currentRevenue, prevRevenue, currentSellers, prevSellers] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: dateFrom, lte: dateTo }, deletedAt: null } }),
      this.prisma.user.count({ where: { createdAt: { gte: prevFrom, lt: dateFrom }, deletedAt: null } }),
      this.prisma.order.count({ where: { createdAt: { gte: dateFrom, lte: dateTo } } }),
      this.prisma.order.count({ where: { createdAt: { gte: prevFrom, lt: dateFrom } } }),
      this.prisma.payment.aggregate({ where: { createdAt: { gte: dateFrom, lte: dateTo }, status: 'CAPTURED' }, _sum: { amountPaise: true } }),
      this.prisma.payment.aggregate({ where: { createdAt: { gte: prevFrom, lt: dateFrom }, status: 'CAPTURED' }, _sum: { amountPaise: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: dateFrom, lte: dateTo }, role: { in: ['SELLER', 'VERIFIED_SELLER'] } } }),
      this.prisma.user.count({ where: { createdAt: { gte: prevFrom, lt: dateFrom }, role: { in: ['SELLER', 'VERIFIED_SELLER'] } } }),
    ]);

    const calcGrowth = (current: number, prev: number) => prev > 0 ? ((current - prev) / prev) * 100 : current > 0 ? 100 : 0;

    return {
      users: { current: currentUsers, previous: prevUsers, growth: calcGrowth(currentUsers, prevUsers) },
      orders: { current: currentOrders, previous: prevOrders, growth: calcGrowth(currentOrders, prevOrders) },
      revenue: { current: currentRevenue._sum.amountPaise || 0, previous: prevRevenue._sum.amountPaise || 0, growth: calcGrowth(currentRevenue._sum.amountPaise || 0, prevRevenue._sum.amountPaise || 0) },
      sellers: { current: currentSellers, previous: prevSellers, growth: calcGrowth(currentSellers, prevSellers) },
    };
  }

  async getRetentionMetrics(days = 90) {
    const cohorts = await this.getCohorts(days);

    const totalUsers = await this.prisma.user.count({ where: { deletedAt: null } });
    const activeUsers = await this.prisma.user.count({ where: { lastLoginAt: { gte: new Date(Date.now() - 7 * 86400_000) }, deletedAt: null } });
    const returningUsers = await this.prisma.user.count({ where: { lastLoginAt: { gte: new Date(Date.now() - 30 * 86400_000) }, createdAt: { lte: new Date(Date.now() - 30 * 86400_000) }, deletedAt: null } });

    return {
      totalUsers,
      activeUsers,
      activeRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
      returningUsers,
      retentionRate: totalUsers > 0 ? Math.round((returningUsers / totalUsers) * 100) : 0,
      cohorts,
    };
  }

  async getFunnelAnalysis(from?: string, to?: string) {
    const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
    const dateTo = to ? new Date(to) : new Date();

    const visitors = parseInt(await this.redis.get(`analytics:visitors:${dateFrom.toISOString().slice(0, 10)}`) || '0', 10) || 10000;

    const [productViews, cartAdds, orders, payments, deliveries] = await Promise.all([
      this.prisma.productView.count({ where: { createdAt: { gte: dateFrom, lte: dateTo } } }),
      this.prisma.cartItem.count({ where: { createdAt: { gte: dateFrom, lte: dateTo } } }),
      this.prisma.order.count({ where: { createdAt: { gte: dateFrom, lte: dateTo } } }),
      this.prisma.payment.count({ where: { createdAt: { gte: dateFrom, lte: dateTo }, status: 'CAPTURED' } }),
      this.prisma.order.count({ where: { deliveredAt: { gte: dateFrom, lte: dateTo } } }),
    ]);

    const funnel = [
      { stage: 'Landing', count: Math.max(visitors, productViews), dropOff: 0 },
      { stage: 'Browse Products', count: productViews, dropOff: Math.max(0, Math.round((1 - productViews / Math.max(visitors, 1)) * 100)) },
      { stage: 'Add to Cart', count: cartAdds, dropOff: Math.max(0, Math.round((1 - cartAdds / Math.max(productViews, 1)) * 100)) },
      { stage: 'Checkout', count: orders, dropOff: Math.max(0, Math.round((1 - orders / Math.max(cartAdds, 1)) * 100)) },
      { stage: 'Payment', count: payments, dropOff: Math.max(0, Math.round((1 - payments / Math.max(orders, 1)) * 100)) },
      { stage: 'Delivered', count: deliveries, dropOff: Math.max(0, Math.round((1 - deliveries / Math.max(payments, 1)) * 100)) },
    ];

    return { funnel, conversion: orders > 0 && visitors > 0 ? Math.round((deliveries / visitors) * 10000) / 100 : 0 };
  }

  async getRevenueAnalytics(from?: string, to?: string, period: string = 'day') {
    const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
    const dateTo = to ? new Date(to) : new Date();

    const payments = await this.prisma.payment.findMany({
      where: { createdAt: { gte: dateFrom, lte: dateTo }, status: 'CAPTURED' },
      select: { amountPaise: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped: Record<string, number> = {};
    for (const p of payments) {
      let key: string;
      const d = new Date(p.createdAt);
      if (period === 'day') key = d.toISOString().slice(0, 10);
      else if (period === 'week') { const start = new Date(d); start.setDate(d.getDate() - d.getDay()); key = start.toISOString().slice(0, 10); }
      else key = d.toISOString().slice(0, 7);
      grouped[key] = (grouped[key] || 0) + p.amountPaise;
    }

    return {
      totalRevenue: payments.reduce((s, p) => s + p.amountPaise, 0),
      orderCount: payments.length,
      averageOrderValue: payments.length > 0 ? Math.round(payments.reduce((s, p) => s + p.amountPaise, 0) / payments.length) : 0,
      timeline: Object.entries(grouped).map(([date, revenue]) => ({ date, revenue })),
    };
  }

  async getCohortAnalysis(days = 90) {
    const cohorts = await this.getCohorts(days);
    return { cohorts };
  }

  async getTrafficSources(from?: string, to?: string) {
    const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
    const dateTo = to ? new Date(to) : new Date();

    const registrationSources = await this.prisma.user.findMany({
      where: { createdAt: { gte: dateFrom, lte: dateTo }, deletedAt: null },
      select: { metadata: true },
    });

    const sourceCounts: Record<string, number> = {};
    for (const u of registrationSources) {
      const source = ((u.metadata as any)?.registrationSource as string) || 'direct';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    }

    const total = Object.values(sourceCounts).reduce((s, c) => s + c, 0);
    return Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }

  private async getCohorts(days: number) {
    const cohorts: Array<{ period: string; users: number; active: number; retention: number }> = [];
    for (let i = 0; i < Math.min(days / 7, 12); i++) {
      const start = new Date(Date.now() - (i + 1) * 7 * 86400_000);
      const end = new Date(Date.now() - i * 7 * 86400_000);
      const users = await this.prisma.user.count({ where: { createdAt: { gte: start, lte: end }, deletedAt: null } });
      const active = await this.prisma.user.count({ where: { createdAt: { gte: start, lte: end }, lastLoginAt: { gte: new Date(Date.now() - 7 * 86400_000) }, deletedAt: null } });
      cohorts.push({
        period: start.toISOString().slice(0, 10),
        users,
        active,
        retention: users > 0 ? Math.round((active / users) * 100) : 0,
      });
    }
    return cohorts;
  }
}
