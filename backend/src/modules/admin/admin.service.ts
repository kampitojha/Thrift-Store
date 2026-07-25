import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [users, products, orders, gmv] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { totalPaise: true },
      }),
    ]);

    const pendingListings = await this.prisma.product.count({
      where: { status: 'PENDING_REVIEW' },
    });
    const openTickets = await this.prisma.supportTicket.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
    });

    return {
      users,
      products,
      orders,
      gmvPaise: gmv._sum.totalPaise ?? 0,
      pendingListings,
      openTickets,
    };
  }

  async pendingProducts(page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { status: 'PENDING_REVIEW' as const, deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: {
          seller: { select: { id: true, username: true, email: true } },
          media: { take: 1 },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async moderateProduct(
    adminId: string,
    productId: string,
    action: 'approve' | 'reject',
    notes?: string,
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException();

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        status: action === 'approve' ? 'ACTIVE' : 'REJECTED',
        publishedAt: action === 'approve' ? new Date() : product.publishedAt,
        moderationNotes: notes,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: `product.${action}`,
        entityType: 'product',
        entityId: productId,
        metadata: { notes },
      },
    });

    return updated;
  }

  async listUsers(page = 1, limit = 20, q?: string) {
    const { skip, take } = paginate(page, limit);
    const where = {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' as const } },
              { username: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          status: true,
          isVerified: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async setUserStatus(adminId: string, userId: string, status: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: status as never },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.status',
        entityType: 'user',
        entityId: userId,
        metadata: { status },
      },
    });
    return user;
  }
}
