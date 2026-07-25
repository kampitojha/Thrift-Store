import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return {
      ...wallet,
      balancePaise: wallet.balancePaise.toString(),
      heldPaise: wallet.heldPaise.toString(),
    };
  }

  async transactions(userId: string, page = 1, limit = 30) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return { data: [], meta: paginationMeta(0, page, limit) };

    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
      data: items.map((t) => ({
        ...t,
        amountPaise: t.amountPaise.toString(),
        balanceAfter: t.balanceAfter.toString(),
      })),
      meta: paginationMeta(total, page, take),
    };
  }

  async requestPayout(userId: string, amountPaise: number) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new BadRequestException('Seller profile required');
    if (!seller.bankVerified) throw new BadRequestException('Bank verification required');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balancePaise < BigInt(amountPaise)) {
      throw new BadRequestException('Insufficient balance');
    }

    const newBalance = wallet.balancePaise - BigInt(amountPaise);

    const [payout] = await this.prisma.$transaction([
      this.prisma.payout.create({
        data: {
          sellerProfileId: seller.id,
          amountPaise: BigInt(amountPaise),
          status: 'PENDING',
          method: 'bank',
          destinationMask: seller.bankAccountMasked,
        },
      }),
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balancePaise: newBalance },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYOUT',
          amountPaise: BigInt(amountPaise),
          balanceAfter: newBalance,
          description: 'Payout request',
        },
      }),
    ]);

    return {
      ...payout,
      amountPaise: payout.amountPaise.toString(),
    };
  }
}
