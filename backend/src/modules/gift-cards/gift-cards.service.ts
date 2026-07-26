import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class GiftCardsService {
  constructor(private readonly prisma: PrismaService) {}

  private generateCode(): string {
    return `GC-${randomBytes(6).toString('hex').toUpperCase()}`;
  }

  async list(page = 1, limit = 24, opts?: { isActive?: boolean }) {
    const p = paginate(page, limit);
    const where: any = {};
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;
    const [items, total] = await Promise.all([
      this.prisma.giftCard.findMany({
        where,
        include: {
          owner: { select: { id: true, username: true, displayName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.giftCard.count({ where }),
    ]);
    return { items, meta: paginationMeta(total, p.page, p.limit) };
  }

  async get(id: string) {
    const card = await this.prisma.giftCard.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, displayName: true, email: true } },
      },
    });
    if (!card) throw new NotFoundException('Gift card not found');
    return card;
  }

  async create(data: {
    amountPaise: number;
    ownerId?: string;
    expiresAt?: string;
  }) {
    if (data.amountPaise < 10000) {
      throw new BadRequestException('Minimum gift card amount is ₹100');
    }
    if (data.amountPaise > 10000000) {
      throw new BadRequestException('Maximum gift card amount is ₹1,00,000');
    }
    return this.prisma.giftCard.create({
      data: {
        code: this.generateCode(),
        amountPaise: data.amountPaise,
        balancePaise: data.amountPaise,
        ownerId: data.ownerId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
  }

  async purchase(userId: string, amountPaise: number) {
    if (amountPaise < 10000) {
      throw new BadRequestException('Minimum gift card amount is ₹100');
    }
    if (amountPaise > 10000000) {
      throw new BadRequestException('Maximum gift card amount is ₹1,00,000');
    }
    return this.prisma.giftCard.create({
      data: {
        code: this.generateCode(),
        amountPaise,
        balancePaise: amountPaise,
        ownerId: userId,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      },
    });
  }

  async validate(code: string) {
    const card = await this.prisma.giftCard.findUnique({ where: { code } });
    if (!card) throw new NotFoundException('Invalid gift card code');
    if (!card.isActive) throw new BadRequestException('Gift card is inactive');
    if (card.expiresAt && card.expiresAt < new Date()) {
      throw new BadRequestException('Gift card has expired');
    }
    if (card.balancePaise <= 0) {
      throw new BadRequestException('Gift card has no balance');
    }
    return {
      valid: true,
      balancePaise: card.balancePaise,
      amountPaise: card.amountPaise,
      expiresAt: card.expiresAt,
    };
  }

  async redeem(code: string, userId: string, amountPaise: number) {
    const card = await this.prisma.giftCard.findUnique({ where: { code } });
    if (!card) throw new NotFoundException('Invalid gift card code');
    if (!card.isActive) throw new BadRequestException('Gift card is inactive');
    if (card.expiresAt && card.expiresAt < new Date()) {
      throw new BadRequestException('Gift card has expired');
    }
    if (card.balancePaise < amountPaise) {
      throw new BadRequestException(
        `Insufficient balance. Available: ₹${Math.floor(card.balancePaise / 100)}`,
      );
    }
    return this.prisma.giftCard.update({
      where: { id: card.id },
      data: { balancePaise: { decrement: amountPaise } },
    });
  }

  async deactivate(id: string) {
    await this.get(id);
    return this.prisma.giftCard.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async myCards(userId: string) {
    return this.prisma.giftCard.findMany({
      where: { ownerId: userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
