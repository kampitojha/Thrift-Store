import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async requestPayout(userId: string, amountPaise: number) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    if (!seller.bankVerified) throw new BadRequestException('Bank account not verified');

    const MIN_PAYOUT = 10000;
    if (amountPaise < MIN_PAYOUT) throw new BadRequestException(`Minimum payout is ₹${MIN_PAYOUT / 100}`);

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balancePaise < BigInt(amountPaise)) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          sellerProfileId: seller.id,
          amountPaise: BigInt(amountPaise),
          status: 'PENDING',
          method: 'UPI',
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balancePaise: { decrement: BigInt(amountPaise) } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYOUT',
          amountPaise: BigInt(amountPaise),
          balanceAfter: wallet.balancePaise - BigInt(amountPaise),
          reference: payout.id,
          description: 'Payout requested',
        },
      });

      return payout;
    });

    this.logger.log(`Payout of ₹${amountPaise / 100} requested by seller ${userId}`);
    return result;
  }

  async listAdmin(page = 1, limit = 20, status?: string) {
    const { skip, take } = paginate(page, limit);
    const where = status ? { status: status as any } : {};
    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          sellerProfile: { select: { storeName: true, userId: true, bankAccountMasked: true } },
        },
      }),
      this.prisma.payout.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async sellerHistory(userId: string, page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const where = { sellerProfile: { userId } };
    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.count({ where }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async processPayout(payoutId: string, action: 'approve' | 'reject' | 'complete', adminNote?: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');

    if (action === 'approve') {
      const updated = await this.prisma.payout.update({
        where: { id: payoutId },
        data: { status: 'PROCESSING' },
      });
      this.logger.log(`Payout ${payoutId} approved for processing`);
      return updated;
    }

    if (action === 'reject') {
      const result = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.payout.update({
          where: { id: payoutId },
          data: { status: 'CANCELLED', failedReason: adminNote || 'Rejected by admin' },
        });

        const wallet = await tx.wallet.findFirst({
          where: { user: { sellerProfile: { id: payout.sellerProfileId } } },
        });
        if (wallet) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balancePaise: { increment: payout.amountPaise } },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'CREDIT',
              amountPaise: payout.amountPaise,
              balanceAfter: wallet.balancePaise + payout.amountPaise,
              reference: payout.id,
              description: 'Payout reversed',
            },
          });
        }

        return updated;
      });

      this.logger.log(`Payout ${payoutId} rejected - funds returned`);
      return result;
    }

    if (action === 'complete') {
      const updated = await this.prisma.payout.update({
        where: { id: payoutId },
        data: { status: 'COMPLETED', processedAt: new Date() },
      });
      this.logger.log(`Payout ${payoutId} completed`);
      return updated;
    }

    throw new BadRequestException('Invalid action. Use: approve, reject, or complete');
  }

  async getSummary() {
    const [pending, processing, completed, failed, totalPayouts] = await Promise.all([
      this.prisma.payout.count({ where: { status: 'PENDING' } }),
      this.prisma.payout.count({ where: { status: 'PROCESSING' } }),
      this.prisma.payout.count({ where: { status: 'COMPLETED' } }),
      this.prisma.payout.count({ where: { status: 'FAILED' } }),
      this.prisma.payout.aggregate({ _sum: { amountPaise: true } }),
    ]);
    return { pending, processing, completed, failed, totalAmountPaise: totalPayouts._sum.amountPaise || BigInt(0) };
  }
}
