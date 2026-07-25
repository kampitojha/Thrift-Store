import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      create: { userId, balancePaise: BigInt(0), heldPaise: BigInt(0) },
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

    const MIN_PAYOUT = 10000;
    if (amountPaise < MIN_PAYOUT) throw new BadRequestException(`Minimum payout is ₹${MIN_PAYOUT / 100}`);

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
          method: 'UPI',
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
          reference: '', description: 'Payout requested',
        },
      }),
    ]);

    return { ...payout, amountPaise: payout.amountPaise.toString() };
  }

  async holdAmount(sellerId: string, orderId: string, amountPaise: number) {
    const wallet = await this.prisma.wallet.upsert({
      where: { userId: sellerId },
      create: { userId: sellerId, balancePaise: BigInt(0), heldPaise: BigInt(0) },
      update: {},
    });
    if (wallet.balancePaise < BigInt(amountPaise)) return;
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balancePaise: { decrement: BigInt(amountPaise) }, heldPaise: { increment: BigInt(amountPaise) } },
    });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id, type: 'HOLD', amountPaise: BigInt(amountPaise),
        balanceAfter: wallet.balancePaise - BigInt(amountPaise),
        reference: orderId, description: 'Funds held pending resolution',
      },
    });
  }

  async releaseHold(sellerId: string, orderId: string) {
    const heldTxns = await this.prisma.walletTransaction.findMany({
      where: { reference: orderId, type: 'HOLD' },
    });
    for (const txn of heldTxns) {
      const wallet = await this.prisma.wallet.findUnique({ where: { id: txn.walletId } });
      if (!wallet) continue;
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balancePaise: { increment: txn.amountPaise }, heldPaise: { decrement: txn.amountPaise } },
      });
      await this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id, type: 'RELEASE', amountPaise: txn.amountPaise,
          balanceAfter: wallet.balancePaise + txn.amountPaise,
          reference: orderId, description: 'Hold released',
        },
      });
    }
  }

  async credit(userId: string, amountPaise: number, reference: string, description: string) {
    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      create: { userId, balancePaise: BigInt(amountPaise), heldPaise: BigInt(0) },
      update: { balancePaise: { increment: BigInt(amountPaise) } },
    });
    return this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id, type: 'CREDIT', amountPaise: BigInt(amountPaise),
        balanceAfter: wallet.balancePaise, reference, description,
      },
    });
  }
}
