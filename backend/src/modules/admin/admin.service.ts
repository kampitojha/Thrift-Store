import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';
import { UserRole } from '@prisma/client';

function getRoleDescription(role: UserRole): string {
  const descriptions: Record<string, string> = {
    SUPER_ADMIN: 'Full system access with all permissions',
    ADMIN: 'Administrative access to most features',
    MODERATOR: 'Can moderate products, reviews, and reports',
    VERIFIED_SELLER: 'Verified seller with selling privileges',
    SELLER: 'Can create and manage product listings',
    BUYER: 'Can browse and purchase products',
    GUEST: 'Limited browsing access',
  };
  return descriptions[role] || '';
}

function getDefaultPermissions(role: string): string[] {
  const permissions: Record<string, string[]> = {
    SUPER_ADMIN: ['*'],
    ADMIN: ['users.*', 'products.*', 'orders.*', 'refunds.*', 'reports.*', 'disputes.*', 'sellers.*', 'analytics.*', 'cms.*', 'coupons.*', 'wallet.*', 'support.*', 'audit.*', 'fraud.*'],
    MODERATOR: ['products.read', 'products.moderate', 'reports.read', 'reports.manage', 'disputes.read', 'disputes.manage', 'users.read'],
    VERIFIED_SELLER: ['products.read', 'products.write', 'orders.read', 'analytics.read'],
    SELLER: ['products.read', 'orders.read'],
    BUYER: ['products.read'],
    GUEST: ['products.read'],
  };
  return permissions[role] || [];
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, activeUsers, newUsersToday, newUsersMonth,
      totalSellers, pendingVerifications, verifiedSellers,
      totalProducts, pendingListings, listingsToday, activeProducts,
      totalOrders, ordersToday, pendingOrders, cancelledOrders,
      gmv, gmvToday, gmvMonth,
      pendingRefunds, pendingPayouts,
      openDisputes, openReports, openTickets,
      platformCommission, topCategories, topSellers, recentUsers,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.sellerProfile.count(),
      this.prisma.sellerProfile.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.sellerProfile.count({ where: { verificationStatus: 'APPROVED' } }),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { status: 'PENDING_REVIEW', deletedAt: null } }),
      this.prisma.product.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.product.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.count({ where: { status: { in: ['PLACED', 'CONFIRMED', 'PACKED'] } } }),
      this.prisma.order.count({ where: { status: 'CANCELLED' } }),
      this.prisma.order.aggregate({ where: { status: { not: 'CANCELLED' } }, _sum: { totalPaise: true } }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: todayStart }, status: { not: 'CANCELLED' } }, _sum: { totalPaise: true } }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } }, _sum: { totalPaise: true } }),
      this.prisma.refund.count({ where: { status: 'PENDING' } }),
      this.prisma.payout.count({ where: { status: 'PENDING' } }),
      this.prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'ESCALATED'] } } }),
      this.prisma.report.count({ where: { status: { in: ['PENDING', 'REVIEWING'] } } }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.orderItem.aggregate({ where: { status: 'DELIVERED' }, _sum: { commissionPaise: true } }),
      this.prisma.category.findMany({ take: 5, orderBy: { products: { _count: 'desc' } }, select: { id: true, name: true, slug: true, _count: { select: { products: true } } } }),
      this.prisma.sellerProfile.findMany({ take: 5, orderBy: { totalSales: 'desc' }, select: { id: true, storeName: true, storeSlug: true, totalSales: true, rating: true, userId: true, _count: { select: { payouts: true } } } }),
      this.prisma.user.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true, role: true } }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers, newToday: newUsersToday, newThisMonth: newUsersMonth },
      sellers: { total: totalSellers, pending: pendingVerifications, verified: verifiedSellers },
      products: { total: totalProducts, pending: pendingListings, newToday: listingsToday, active: activeProducts },
      orders: { total: totalOrders, today: ordersToday, pending: pendingOrders, cancelled: cancelledOrders },
      revenue: { gmv: gmv._sum.totalPaise ?? BigInt(0), gmvToday: gmvToday._sum.totalPaise ?? BigInt(0), gmvMonth: gmvMonth._sum.totalPaise ?? BigInt(0), commission: platformCommission._sum.commissionPaise ?? BigInt(0) },
      pending: { refunds: pendingRefunds, payouts: pendingPayouts, disputes: openDisputes, reports: openReports, tickets: openTickets },
      topCategories, topSellers, recentUsers,
    };
  }

  async listUsers(page = 1, limit = 20, opts?: { q?: string; role?: string; status?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const { skip, take } = paginate(page, limit);
    const where: any = { deletedAt: null };
    if (opts?.q) {
      where.OR = [
        { email: { contains: opts.q, mode: 'insensitive' } },
        { username: { contains: opts.q, mode: 'insensitive' } },
        { displayName: { contains: opts.q, mode: 'insensitive' } },
      ];
    }
    if (opts?.role) where.role = opts.role;
    if (opts?.status) where.status = opts.status;

    const orderBy: any = { [opts?.sortBy || 'createdAt']: opts?.sortOrder || 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take, orderBy,
        select: {
          id: true, email: true, username: true, displayName: true, avatarUrl: true,
          role: true, status: true, isVerified: true, createdAt: true, lastLoginAt: true,
          _count: { select: { ordersAsBuyer: true, products: true, followers: true, follows: true, reviewsAuthored: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, username: true, displayName: true, firstName: true, lastName: true,
        avatarUrl: true, coverUrl: true, bio: true, phone: true, city: true, state: true, country: true,
        role: true, status: true, isVerified: true, twoFactorEnabled: true, createdAt: true, lastLoginAt: true, deletedAt: true,
        sellerProfile: { select: { id: true, storeName: true, storeSlug: true, verificationStatus: true, totalSales: true, rating: true, bankVerified: true } },
        wallet: { select: { balancePaise: true, heldPaise: true } },
        profile: true,
        _count: { select: { ordersAsBuyer: true, products: true, followers: true, follows: true, reviewsAuthored: true, reviewsReceived: true, notifications: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [recentOrders, recentProducts, recentReviews, loginHistory, auditLogs] = await Promise.all([
      this.prisma.order.findMany({ where: { buyerId: userId }, take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, orderNumber: true, totalPaise: true, status: true, createdAt: true } }),
      this.prisma.product.findMany({ where: { sellerId: userId, deletedAt: null }, take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, pricePaise: true, status: true, createdAt: true } }),
      this.prisma.review.findMany({ where: { authorId: userId, deletedAt: null }, take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, rating: true, title: true, body: true, createdAt: true } }),
      this.prisma.loginHistory.findMany({ where: { userId }, take: 10, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditLog.findMany({ where: { userId }, take: 10, orderBy: { createdAt: 'desc' } }),
    ]);

    return { ...user, recentOrders, recentProducts, recentReviews, loginHistory, auditLogs };
  }

  async setUserStatus(adminId: string, userId: string, status: string) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { status: status as any } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: `user.status.${status}`, entityType: 'user', entityId: userId, metadata: { status } } });
    return user;
  }

  async setUserRole(adminId: string, userId: string, role: string) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { role: role as any } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: `user.role.${role}`, entityType: 'user', entityId: userId, metadata: { role } } });
    return user;
  }

  async deleteUser(adminId: string, userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'DELETED', deletedAt: new Date(), email: `deleted_${userId}@reloom.in`, username: `deleted_${userId}`, passwordHash: null } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: 'user.delete', entityType: 'user', entityId: userId } });
    return { ok: true };
  }

  async listSellers(page = 1, limit = 20, opts?: { q?: string; verification?: string }) {
    const { skip, take } = paginate(page, limit);
    const where: any = {};
    if (opts?.q) {
      where.OR = [
        { storeName: { contains: opts.q, mode: 'insensitive' } },
        { user: { OR: [{ username: { contains: opts.q, mode: 'insensitive' } }, { email: { contains: opts.q, mode: 'insensitive' } }] } },
      ];
    }
    if (opts?.verification) where.verificationStatus = opts.verification;

    const [items, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true, avatarUrl: true, status: true, createdAt: true, _count: { select: { products: true } } } },
        },
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async getSellerDetail(sellerId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      include: {
        user: { select: { id: true, username: true, email: true, displayName: true, avatarUrl: true, phone: true, status: true, role: true, createdAt: true, _count: { select: { products: true } } } },
      },
    });
    if (!seller) throw new NotFoundException('Seller not found');

    const [orderStats, products, wallet, verifications, followersCount, reviewsCount, inventoryCount, pendingPayout] = await Promise.all([
      this.prisma.orderItem.aggregate({ where: { sellerId: seller.userId, status: 'DELIVERED' }, _sum: { totalPaise: true, sellerEarningPaise: true, commissionPaise: true }, _count: true }),
      this.prisma.product.findMany({ where: { sellerId: seller.userId, deletedAt: null }, take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, pricePaise: true, status: true } }),
      this.prisma.wallet.findUnique({ where: { userId: seller.userId }, select: { balancePaise: true, heldPaise: true } }),
      this.prisma.sellerVerification.findMany({ where: { sellerProfileId: sellerId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.follow.count({ where: { followingId: seller.userId } }),
      this.prisma.review.count({ where: { targetUserId: seller.userId, deletedAt: null } }),
      this.prisma.product.count({ where: { sellerId: seller.userId, deletedAt: null, status: { in: ['ACTIVE', 'PENDING_REVIEW'] } } }),
      this.prisma.payout.findFirst({ where: { sellerProfileId: sellerId, status: 'PENDING' }, select: { amountPaise: true, createdAt: true } }),
    ]);

    return { ...seller, stats: { totalOrders: orderStats._count, totalRevenue: orderStats._sum.totalPaise || BigInt(0), totalEarnings: orderStats._sum.sellerEarningPaise || BigInt(0), totalCommission: orderStats._sum.commissionPaise || BigInt(0) }, recentProducts: products, wallet, verifications, followersCount, reviewsCount, inventoryCount, pendingPayout };
  }

  async verifySeller(adminId: string, sellerId: string, action: 'approve' | 'reject', notes?: string) {
    const status = action === 'approve' ? 'VERIFIED' : 'REJECTED';
    const seller = await this.prisma.sellerProfile.update({ where: { id: sellerId }, data: { verificationStatus: status as any } });
    await this.prisma.sellerVerification.create({ data: { sellerProfileId: sellerId, type: 'identity', status: status as any, reviewedBy: adminId, notes } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: `seller.verify.${action}`, entityType: 'seller', entityId: sellerId, metadata: { notes } } });
    return seller;
  }

  async listProducts(page = 1, limit = 20, opts?: { q?: string; status?: string; category?: string }) {
    const { skip, take } = paginate(page, limit);
    const where: any = { deletedAt: null };
    if (opts?.q) where.OR = [{ title: { contains: opts.q, mode: 'insensitive' } }, { slug: { contains: opts.q, mode: 'insensitive' } }];
    if (opts?.status) where.status = opts.status;
    if (opts?.category) where.categoryId = opts.category;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, username: true } },
          category: { select: { id: true, name: true } },
          media: { take: 1, select: { url: true } },
          _count: { select: { reviews: true, wishlistItems: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async getProductDetail(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true } },
        media: { orderBy: { sortOrder: 'asc' } },
        reviews: { take: 5, orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, username: true, avatarUrl: true } } } },
        _count: { select: { reviews: true, wishlistItems: true, orderItems: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async moderateProduct(adminId: string, productId: string, action: string, notes?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException();

    const updateData: any = { moderationNotes: notes };
    if (action === 'approve') { updateData.status = 'ACTIVE'; updateData.publishedAt = new Date(); }
    else if (action === 'reject') { updateData.status = 'REJECTED'; }
    else if (action === 'hide') { updateData.status = 'HIDDEN'; }
    else if (action === 'unhide') { updateData.status = 'ACTIVE'; }
    else if (action === 'feature') { updateData.isFeatured = true; updateData.status = 'ACTIVE'; updateData.publishedAt = new Date(); }
    else if (action === 'unfeature') { updateData.isFeatured = false; }
    else if (action === 'delete') { updateData.deletedAt = new Date(); updateData.status = 'ARCHIVED'; }

    const updated = await this.prisma.product.update({ where: { id: productId }, data: updateData });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: `product.${action}`, entityType: 'product', entityId: productId, metadata: { notes } } });
    return updated;
  }

  async listOrders(page = 1, limit = 20, opts?: { q?: string; status?: string }) {
    const { skip, take } = paginate(page, limit);
    const where: any = {};
    if (opts?.q) where.OR = [{ orderNumber: { contains: opts.q, mode: 'insensitive' } }, { buyer: { username: { contains: opts.q, mode: 'insensitive' } } }];
    if (opts?.status) where.status = opts.status;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          items: { include: { product: { select: { id: true, title: true } } } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async getOrderDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, username: true, displayName: true, avatarUrl: true, email: true } },
        items: { include: { product: { select: { id: true, title: true, slug: true } } } },
        timeline: { orderBy: { createdAt: 'desc' } },
        refunds: true,
        payments: true,
        shippingAddress: true,
        billingAddress: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelOrder(adminId: string, orderId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) throw new BadRequestException(`Cannot cancel order in ${order.status} status`);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', timeline: { create: { status: 'CANCELLED', note: reason || 'Cancelled by admin', actorId: adminId } } },
    });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: 'order.cancel', entityType: 'order', entityId: orderId, metadata: { reason } } });
    return updated;
  }

  async listDisputes(page = 1, limit = 20, opts?: { status?: string }) {
    const { skip, take } = paginate(page, limit);
    const where: any = {};
    if (opts?.status) where.status = opts.status;

    const [items, total] = await Promise.all([
      this.prisma.dispute.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { order: { select: { id: true, orderNumber: true, totalPaise: true, status: true } } } }),
      this.prisma.dispute.count({ where }),
    ]);

    const raiderIds = [...new Set(items.map((d) => d.raisedById))];
    const raiders = await this.prisma.user.findMany({ where: { id: { in: raiderIds } }, select: { id: true, username: true, displayName: true, avatarUrl: true } });
    const raiderMap = new Map(raiders.map((r) => [r.id, r]));
    return { data: items.map((d) => ({ ...d, raisedBy: raiderMap.get(d.raisedById) || null })), meta: paginationMeta(total, page, take) };
  }

  async resolveDispute(adminId: string, disputeId: string, action: string, resolution?: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    const statusMap: Record<string, string> = { resolve_buyer: 'RESOLVED_BUYER', resolve_seller: 'RESOLVED_SELLER', escalate: 'ESCALATED', close: 'CLOSED' };
    const updated = await this.prisma.dispute.update({ where: { id: disputeId }, data: { status: statusMap[action] as any, resolution, resolvedAt: action === 'close' ? new Date() : undefined } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: `dispute.${action}`, entityType: 'dispute', entityId: disputeId, metadata: { resolution } } });
    return updated;
  }

  async listReports(page = 1, limit = 20, opts?: { status?: string }) {
    const { skip, take } = paginate(page, limit);
    const where: any = {};
    if (opts?.status) where.status = opts.status;
    const [items, total] = await Promise.all([
      this.prisma.report.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { reporter: { select: { id: true, username: true, displayName: true } } } }),
      this.prisma.report.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async resolveReport(adminId: string, reportId: string, action: string, note?: string) {
    const statusMap: Record<string, string> = { resolve: 'RESOLVED', dismiss: 'DISMISSED', escalate: 'ESCALATED' };
    const updated = await this.prisma.report.update({ where: { id: reportId }, data: { status: statusMap[action] as any } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: `report.${action}`, entityType: 'report', entityId: reportId, metadata: { note } } });
    return updated;
  }

  async listRefunds(page = 1, limit = 20, status?: string) {
    const { skip, take } = paginate(page, limit);
    const where = status ? { status: status as any } : {};
    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { order: { select: { id: true, orderNumber: true, totalPaise: true, status: true, buyer: { select: { username: true, displayName: true } } } } } }),
      this.prisma.refund.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async listReturns(page = 1, limit = 20, status?: string) {
    const { skip, take } = paginate(page, limit);
    const where: any = status ? { status } : { status: { in: ['RETURN_REQUESTED', 'RETURNED', 'REFUNDED'] } };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip, take, orderBy: { updatedAt: 'desc' }, include: { buyer: { select: { id: true, username: true, displayName: true } }, items: { select: { id: true, quantity: true, totalPaise: true, product: { select: { id: true, title: true } } } } } }),
      this.prisma.order.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async listCoupons(page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({ where: {}, skip, take, orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { id: true, username: true } } } }),
      this.prisma.coupon.count(),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async createCoupon(adminId: string, data: any) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) throw new ConflictException('Coupon code already exists');
    const coupon = await this.prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        minOrderPaise: data.minOrderPaise,
        maxDiscountPaise: data.maxDiscountPaise,
        usageLimit: data.usageLimit,
        perUserLimit: data.perUserLimit ?? 1,
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        endsAt: data.endsAt ? new Date(data.endsAt) : new Date(Date.now() + 30 * 864e5),
        isActive: data.isActive ?? true,
        createdById: adminId,
      },
    });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: 'coupon.create', entityType: 'coupon', entityId: coupon.id } });
    return coupon;
  }

  async updateCoupon(id: string, data: any) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (data.code && data.code.toUpperCase() !== coupon.code) {
      const existing = await this.prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } });
      if (existing) throw new ConflictException('Coupon code already exists');
    }
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(data.code ? { code: data.code.toUpperCase() } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.value !== undefined ? { value: data.value } : {}),
        ...(data.minOrderPaise !== undefined ? { minOrderPaise: data.minOrderPaise } : {}),
        ...(data.maxDiscountPaise !== undefined ? { maxDiscountPaise: data.maxDiscountPaise } : {}),
        ...(data.usageLimit !== undefined ? { usageLimit: data.usageLimit } : {}),
        ...(data.perUserLimit !== undefined ? { perUserLimit: data.perUserLimit } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.startsAt ? { startsAt: new Date(data.startsAt) } : {}),
        ...(data.endsAt ? { endsAt: new Date(data.endsAt) } : {}),
      },
    });
  }

  async deleteCoupon(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    await this.prisma.coupon.delete({ where: { id } });
    return { ok: true };
  }

  // ── Categories Admin ──

  async listCategories(page = 1, limit = 50, search?: string) {
    const { skip, take } = paginate(page, limit);
    const where: any = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.category.findMany({ where, skip, take, orderBy: { sortOrder: 'asc' }, include: { parent: { select: { id: true, name: true } }, _count: { select: { products: true, children: true } } } }),
      this.prisma.category.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async getCategory(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id }, include: { parent: { select: { id: true, name: true } }, children: { select: { id: true, name: true, slug: true } }, _count: { select: { products: true } } } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async createCategory(data: { name: string; slug?: string; description?: string; imageUrl?: string; iconUrl?: string; parentId?: string; sortOrder?: number; isActive?: boolean; seoTitle?: string; seoDesc?: string }) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return this.prisma.category.create({ data: { ...data, slug } });
  }

  async updateCategory(id: string, data: any) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    if (data.name && !data.slug) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    return this.prisma.category.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat._count.products > 0 || cat._count.children > 0) {
      throw new BadRequestException('Cannot delete category with products or subcategories');
    }
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  async listAuditLogs(page = 1, limit = 50, opts?: { userId?: string; action?: string; entityType?: string }) {
    const { skip, take } = paginate(page, limit);
    const where: any = {};
    if (opts?.userId) where.userId = opts.userId;
    if (opts?.action) where.action = { contains: opts.action, mode: 'insensitive' };
    if (opts?.entityType) where.entityType = opts.entityType;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, username: true, displayName: true } } } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async globalSearch(q: string) {
    const [users, products, orders, sellers] = await Promise.all([
      this.prisma.user.findMany({ where: { OR: [{ username: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }] }, take: 5, select: { id: true, username: true, displayName: true, avatarUrl: true, role: true, status: true } }),
      this.prisma.product.findMany({ where: { OR: [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }], deletedAt: null }, take: 5, select: { id: true, title: true, slug: true, pricePaise: true, status: true } }),
      this.prisma.order.findMany({ where: { orderNumber: { contains: q, mode: 'insensitive' } }, take: 5, select: { id: true, orderNumber: true, totalPaise: true, status: true, createdAt: true } }),
      this.prisma.sellerProfile.findMany({ where: { OR: [{ storeName: { contains: q, mode: 'insensitive' } }, { storeSlug: { contains: q, mode: 'insensitive' } }] }, take: 5, select: { id: true, storeName: true, storeSlug: true, verificationStatus: true, totalSales: true } }),
    ]);
    return { users, products, orders, sellers };
  }

  async fraudAlerts() {
    return this.getFraudAlertsDetailed();
  }

  async activityFeed(page = 1, limit = 30) {
    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where: {}, skip, take, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, username: true, displayName: true } } } }),
      this.prisma.auditLog.count(),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  // ── Refund Process ──

  async processRefund(adminId: string, refundId: string, action: string, amountPaise?: number, notes?: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId }, include: { order: true } });
    if (!refund) throw new NotFoundException('Refund not found');

    let status: string;
    if (action === 'approve') {
      status = 'APPROVED';
    } else if (action === 'reject') {
      status = 'REJECTED';
    } else if (action === 'partial') {
      status = 'PARTIALLY_REFUNDED';
    } else {
      throw new BadRequestException('Invalid action');
    }

    const updated = await this.prisma.refund.update({
      where: { id: refundId },
      data: { status: status as any, processedAt: new Date() },
    });

    if (action === 'approve' || action === 'partial') {
      await this.prisma.order.update({
        where: { id: refund.orderId },
        data: { status: 'REFUNDED', timeline: { create: { status: 'REFUNDED', note: notes || `Refund ${action}d by admin`, actorId: adminId } } },
      });
    }

    await this.prisma.auditLog.create({ data: { userId: adminId, action: `refund.${action}`, entityType: 'refund', entityId: refundId, metadata: { notes } } });
    return updated;
  }

  // ── Return Process ──

  async processReturn(adminId: string, returnId: string, action: string, notes?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: returnId } });
    if (!order) throw new NotFoundException('Return order not found');

    if (action === 'approve') {
      await this.prisma.order.update({
        where: { id: returnId },
        data: { status: 'RETURNED', timeline: { create: { status: 'RETURNED', note: notes || 'Return approved by admin', actorId: adminId } } },
      });
    } else if (action === 'reject') {
      await this.prisma.order.update({
        where: { id: returnId },
        data: { status: 'DELIVERED', timeline: { create: { status: 'DELIVERED', note: notes || 'Return rejected by admin', actorId: adminId } } },
      });
    } else {
      throw new BadRequestException('Invalid action');
    }

    await this.prisma.auditLog.create({ data: { userId: adminId, action: `return.${action}`, entityType: 'order', entityId: returnId, metadata: { notes } } });
    return { ok: true };
  }

  // ── User Restore ──

  async restoreUser(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null, status: 'ACTIVE' },
    });

    await this.prisma.auditLog.create({ data: { userId: adminId, action: 'user.restore', entityType: 'user', entityId: userId } });
    return updated;
  }

  // ── User Reset Password ──

  async resetUserPassword(adminId: string, userId: string, newPassword: string) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: 'user.password.reset', entityType: 'user', entityId: userId } });
    return { ok: true };
  }

  // ── Force Logout ──

  async forceLogout(adminId: string, userId: string) {
    await this.prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: 'user.force.logout', entityType: 'user', entityId: userId } });
    return { ok: true };
  }

  // ── Notifications ──

  async listAdminNotifications(page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { type: { in: ['SYSTEM', 'VERIFICATION', 'PAYOUT', 'ORDER_UPDATE'] as any } };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } }),
      this.prisma.notification.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async markNotificationsRead(ids?: string[], all?: boolean) {
    if (all) {
      await this.prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true, readAt: new Date() } });
    } else if (ids?.length) {
      await this.prisma.notification.updateMany({ where: { id: { in: ids } }, data: { isRead: true, readAt: new Date() } });
    }
    return { ok: true };
  }

  // ── Roles ──

  async listRoles() {
    return Object.values(UserRole).map(r => ({ name: r, description: getRoleDescription(r), permissions: getDefaultPermissions(r) }));
  }

  async createRole(name: string, description?: string, permissions?: string[]) {
    await this.prisma.auditLog.create({ data: { action: 'role.create', entityType: 'role', entityId: name, metadata: { description, permissions } } });
    return { name, description, permissions };
  }

  async updateRole(id: string, data: { name?: string; description?: string; permissions?: string[] }) {
    await this.prisma.auditLog.create({ data: { action: 'role.update', entityType: 'role', entityId: id, metadata: data } });
    return { ...data, id };
  }

  async deleteRole(id: string) {
    await this.prisma.auditLog.create({ data: { action: 'role.delete', entityType: 'role', entityId: id } });
    return { ok: true };
  }

  // ── Permissions ──

  async listPermissions() {
    const permissions = [
      { key: 'users.read', label: 'View Users', group: 'Users' },
      { key: 'users.write', label: 'Create/Edit Users', group: 'Users' },
      { key: 'users.delete', label: 'Delete Users', group: 'Users' },
      { key: 'users.manage', label: 'Manage User Roles', group: 'Users' },
      { key: 'products.read', label: 'View Products', group: 'Products' },
      { key: 'products.moderate', label: 'Moderate Products', group: 'Products' },
      { key: 'products.feature', label: 'Feature Products', group: 'Products' },
      { key: 'products.delete', label: 'Delete Products', group: 'Products' },
      { key: 'orders.read', label: 'View Orders', group: 'Orders' },
      { key: 'orders.manage', label: 'Manage Orders', group: 'Orders' },
      { key: 'orders.cancel', label: 'Cancel Orders', group: 'Orders' },
      { key: 'orders.refund', label: 'Process Refunds', group: 'Orders' },
      { key: 'payments.read', label: 'View Payments', group: 'Payments' },
      { key: 'payments.manage', label: 'Manage Payments', group: 'Payments' },
      { key: 'refunds.read', label: 'View Refunds', group: 'Refunds' },
      { key: 'refunds.process', label: 'Process Refunds', group: 'Refunds' },
      { key: 'reports.read', label: 'View Reports', group: 'Reports' },
      { key: 'reports.manage', label: 'Manage Reports', group: 'Reports' },
      { key: 'disputes.read', label: 'View Disputes', group: 'Disputes' },
      { key: 'disputes.manage', label: 'Manage Disputes', group: 'Disputes' },
      { key: 'sellers.read', label: 'View Sellers', group: 'Sellers' },
      { key: 'sellers.verify', label: 'Verify Sellers', group: 'Sellers' },
      { key: 'sellers.manage', label: 'Manage Sellers', group: 'Sellers' },
      { key: 'analytics.read', label: 'View Analytics', group: 'Analytics' },
      { key: 'cms.read', label: 'View CMS', group: 'CMS' },
      { key: 'cms.write', label: 'Manage CMS', group: 'CMS' },
      { key: 'coupons.read', label: 'View Coupons', group: 'Coupons' },
      { key: 'coupons.write', label: 'Manage Coupons', group: 'Coupons' },
      { key: 'wallet.read', label: 'View Wallets', group: 'Wallet' },
      { key: 'wallet.manage', label: 'Manage Wallets', group: 'Wallet' },
      { key: 'support.read', label: 'View Support Tickets', group: 'Support' },
      { key: 'support.manage', label: 'Manage Support', group: 'Support' },
      { key: 'settings.read', label: 'View Settings', group: 'Settings' },
      { key: 'settings.write', label: 'Manage Settings', group: 'Settings' },
      { key: 'feature-flags.read', label: 'View Feature Flags', group: 'Feature Flags' },
      { key: 'feature-flags.write', label: 'Manage Feature Flags', group: 'Feature Flags' },
      { key: 'audit.read', label: 'View Audit Logs', group: 'Audit' },
      { key: 'fraud.read', label: 'View Fraud Data', group: 'Fraud' },
    ];
    return permissions;
  }

  // ── Export Users ──

  async exportUsers(format: 'csv' | 'json') {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, username: true, displayName: true, role: true, status: true, isVerified: true, createdAt: true, lastLoginAt: true, city: true, state: true, country: true },
    });

    if (format === 'csv') {
      const header = 'ID,Email,Username,DisplayName,Role,Status,Verified,CreatedAt,LastLoginAt,City,State,Country\n';
      const rows = users.map(u => `${u.id},${u.email},${u.username},${u.displayName||''},${u.role},${u.status},${u.isVerified},${u.createdAt.toISOString()},${u.lastLoginAt?.toISOString()||''},${u.city||''},${u.state||''},${u.country||''}`).join('\n');
      return { data: header + rows, format, count: users.length };
    }
    return { data: users, format, count: users.length };
  }

  // ── Bulk Actions ──

  async bulkUserAction(userIds: string[], action: string, value?: string) {
    const results = [];
    for (const userId of userIds) {
      try {
        if (action === 'suspend') {
          await this.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
        } else if (action === 'activate') {
          await this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
        } else if (action === 'delete') {
          await this.prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date(), status: 'DELETED' } });
        } else if (action === 'restore') {
          await this.prisma.user.update({ where: { id: userId }, data: { deletedAt: null, status: 'ACTIVE' } });
        } else if (action === 'role' && value) {
          await this.prisma.user.update({ where: { id: userId }, data: { role: value as any } });
        }
        results.push({ userId, success: true });
      } catch (e: any) {
        results.push({ userId, success: false, error: e.message });
      }
    }
    return { results, action };
  }

  async bulkSellerAction(sellerIds: string[], action: string, value?: string) {
    const results = [];
    for (const sellerId of sellerIds) {
      try {
        if (action === 'verify') {
          await this.verifySeller('system', sellerId, 'approve', 'Bulk verification');
        } else if (action === 'suspend') {
          await this.prisma.sellerProfile.update({ where: { id: sellerId }, data: { isVacationMode: true } });
        } else if (action === 'activate') {
          await this.prisma.sellerProfile.update({ where: { id: sellerId }, data: { isVacationMode: false } });
        }
        results.push({ sellerId, success: true });
      } catch (e: any) {
        results.push({ sellerId, success: false, error: e.message });
      }
    }
    return { results, action };
  }

  async bulkProductAction(productIds: string[], action: string, value?: string) {
    const results = [];
    for (const productId of productIds) {
      try {
        if (action === 'approve') {
          await this.moderateProduct('system', productId, 'approve', 'Bulk approval');
        } else if (action === 'reject') {
          await this.moderateProduct('system', productId, 'reject', value || 'Bulk rejection');
        } else if (action === 'hide') {
          await this.moderateProduct('system', productId, 'hide', '');
        } else if (action === 'feature') {
          await this.moderateProduct('system', productId, 'feature', '');
        }
        results.push({ productId, success: true });
      } catch (e: any) {
        results.push({ productId, success: false, error: e.message });
      }
    }
    return { results, action };
  }

  // ── Seller Status ──

  async setSellerStatus(adminId: string, sellerId: string, status: 'SUSPENDED' | 'BANNED' | 'ACTIVE') {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller not found');

    await this.prisma.sellerProfile.update({ where: { id: sellerId }, data: { isVacationMode: status === 'SUSPENDED' } });
    await this.prisma.user.update({ where: { id: seller.userId }, data: { status: status as any } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: `seller.status.${status}`, entityType: 'seller', entityId: sellerId } });
    return { ok: true };
  }

  // ── Trending ──

  async toggleTrending(productId: string, isTrending: boolean) {
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { isFeatured: isTrending },
    });
    return product;
  }

  // ── Fraud Alerts Detailed ──

  async getFraudAlertsDetailed() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 864e5);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 864e5);
    const oneDayAgo = new Date(now.getTime() - 864e5);

    const [
      suspiciousAccounts,
      inactiveVerifiedSellers,
      highRefundSellers,
      duplicateAccounts,
      fakeReviewAccounts,
      spamListings,
      bulkListings,
    ] = await Promise.all([
      this.prisma.user.findMany({ where: { status: 'PENDING_VERIFICATION', createdAt: { lte: thirtyDaysAgo } }, take: 20, select: { id: true, username: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.sellerProfile.findMany({ where: { verificationStatus: 'APPROVED', totalSales: 0 }, take: 20, include: { user: { select: { id: true, username: true, email: true, createdAt: true, lastLoginAt: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.sellerProfile.findMany({ where: { totalSales: { gt: 0 } }, take: 20, orderBy: { totalSales: 'desc' }, select: { id: true, storeName: true, totalSales: true, totalRevenuePaise: true, userId: true } }),
      this.prisma.user.findMany({ where: { deletedAt: null }, take: 100, select: { id: true, username: true, email: true, displayName: true, createdAt: true } }),
      this.prisma.review.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, take: 20, orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, username: true } }, product: { select: { id: true, title: true } } } }),
      this.prisma.product.findMany({ where: { status: 'PENDING_REVIEW', createdAt: { gte: sevenDaysAgo } }, take: 20, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, slug: true, pricePaise: true, createdAt: true, sellerId: true } }),
      this.prisma.product.groupBy({ by: ['sellerId'], where: { createdAt: { gte: oneDayAgo } }, _count: { id: true } }),
    ]);

    return {
      suspiciousAccounts: suspiciousAccounts.map(a => ({ ...a, flags: ['Pending verification >30 days'] })),
      inactiveVerifiedSellers: inactiveVerifiedSellers.map(s => ({ ...s, activeListings: 0, lastActiveAt: s.user.lastLoginAt })),
      highRefundSellers: highRefundSellers.map(s => ({ ...s, refundRate: 0 })),
      duplicateAccounts: [],
      fakeReviews: fakeReviewAccounts,
      spamListings: spamListings,
      bulkListings: [],
    };
  }
}
