import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: {
    code: string; type: string; value: number; minOrderPaise?: number;
    maxDiscountPaise?: number; usageLimit?: number; perUserLimit?: number;
    startsAt?: string; endsAt?: string;
  }) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) throw new ConflictException('Coupon code already exists');

    return this.prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        type: data.type as any,
        value: data.value,
        minOrderPaise: data.minOrderPaise,
        maxDiscountPaise: data.maxDiscountPaise,
        usageLimit: data.usageLimit,
        perUserLimit: data.perUserLimit ?? 1,
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        endsAt: data.endsAt ? new Date(data.endsAt) : new Date(Date.now() + 30 * 864e5),
        isActive: true,
        sellerOnly: true,
        createdById: userId,
      },
    });
  }

  async findAll(userId: string, page = 1, limit = 24) {
    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where: { createdById: userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where: { createdById: userId } }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async findOne(userId: string, id: string) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, createdById: userId } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async update(userId: string, id: string, data: Record<string, unknown>) {
    const coupon = await this.findOne(userId, id);
    if (data.code && data.code !== coupon.code) {
      const existing = await this.prisma.coupon.findUnique({ where: { code: (data.code as string).toUpperCase() } });
      if (existing) throw new ConflictException('Coupon code already exists');
    }
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(data.code ? { code: (data.code as string).toUpperCase() } : {}),
        ...(data.type ? { type: data.type as any } : {}),
        ...(data.value !== undefined ? { value: data.value as number } : {}),
        ...(data.minOrderPaise !== undefined ? { minOrderPaise: data.minOrderPaise as number } : {}),
        ...(data.maxDiscountPaise !== undefined ? { maxDiscountPaise: data.maxDiscountPaise as number } : {}),
        ...(data.usageLimit !== undefined ? { usageLimit: data.usageLimit as number } : {}),
        ...(data.perUserLimit !== undefined ? { perUserLimit: data.perUserLimit as number } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive as boolean } : {}),
        ...(data.startsAt ? { startsAt: new Date(data.startsAt as string) } : {}),
        ...(data.endsAt ? { endsAt: new Date(data.endsAt as string) } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.coupon.delete({ where: { id } });
    return { ok: true };
  }

  async validateCoupon(code: string, subtotalPaise: number): Promise<{ id: string; code: string; discountPaise: number; type: string } | null> {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) return null;
    const now = new Date();
    if (now < coupon.startsAt || now > coupon.endsAt) return null;
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return null;
    if (coupon.minOrderPaise && subtotalPaise < coupon.minOrderPaise) return null;

    let discountPaise = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountPaise = Math.floor((subtotalPaise * coupon.value) / 100);
      if (coupon.maxDiscountPaise) discountPaise = Math.min(discountPaise, coupon.maxDiscountPaise);
    } else if (coupon.type === 'FIXED') {
      discountPaise = coupon.value;
    } else if (coupon.type === 'FREE_SHIPPING') {
      discountPaise = 0;
    }

    return { id: coupon.id, code: coupon.code, discountPaise, type: coupon.type };
  }

  async getAvailableCoupons(userId: string, subtotalPaise: number) {
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
        OR: [
          { usageLimit: null },
          { usedCount: { lt: this.prisma.coupon.fields.usageLimit } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const valid: Array<{ id: string; code: string; type: string; value: number; discountPaise: number; minOrderPaise: number | null; maxDiscountPaise: number | null }> = [];
    for (const coupon of coupons) {
      if (coupon.minOrderPaise && subtotalPaise < coupon.minOrderPaise) continue;
      let discountPaise = 0;
      if (coupon.type === 'PERCENTAGE') {
        discountPaise = Math.floor((subtotalPaise * coupon.value) / 100);
        if (coupon.maxDiscountPaise) discountPaise = Math.min(discountPaise, coupon.maxDiscountPaise);
      } else if (coupon.type === 'FIXED') {
        discountPaise = coupon.value;
      }
      valid.push({ id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, discountPaise, minOrderPaise: coupon.minOrderPaise, maxDiscountPaise: coupon.maxDiscountPaise });
    }

    return valid;
  }
}
