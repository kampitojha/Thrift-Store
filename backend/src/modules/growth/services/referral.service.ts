import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCode(userId: string, customCode?: string) {
    const existing = await this.prisma.referralCode.findUnique({ where: { userId } });
    if (existing) return existing;

    const code = customCode || this.generateCode();
    return this.prisma.referralCode.create({
      data: { userId, code, maxUses: null },
    });
  }

  async getDashboard(userId: string) {
    const [code, referrals, stats] = await Promise.all([
      this.prisma.referralCode.findUnique({ where: { userId } }),
      this.prisma.referral.findMany({
        where: { referrerId: userId },
        include: { referee: { select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.getReferralStats(userId),
    ]);

    return { code: code?.code || null, referrals, stats };
  }

  async applyReferral(userId: string, code: string) {
    const referralCode = await this.prisma.referralCode.findUnique({ where: { code } });
    if (!referralCode) return { success: false, error: 'Invalid referral code' };
    if (referralCode.userId === userId) return { success: false, error: 'Cannot refer yourself' };
    if (referralCode.maxUses && referralCode.uses >= referralCode.maxUses) return { success: false, error: 'Referral code expired' };

    const existing = await this.prisma.referral.findUnique({ where: { refereeId: userId } });
    if (existing) return { success: false, error: 'Already referred by someone' };

    const referral = await this.prisma.referral.create({
      data: {
        referrerId: referralCode.userId,
        refereeId: userId,
        code,
        status: 'pending',
      },
    });

    await this.prisma.referralCode.update({
      where: { code },
      data: { uses: { increment: 1 } },
    });

    return { success: true, referral };
  }

  async completeReferral(refereeId: string) {
    const referral = await this.prisma.referral.findUnique({ where: { refereeId } });
    if (!referral || referral.status !== 'pending') return { success: false };

    const rewardPaise = 5000;
    const rewardPoints = 200;

    const [updated] = await Promise.all([
      this.prisma.referral.update({
        where: { id: referral.id },
        data: { status: 'completed', rewardPaise, rewardPoints, completedAt: new Date() },
      }),
    ]);

    return { success: true, rewardPaise, rewardPoints, referrerId: referral.referrerId };
  }

  async getReferralStats(userId: string) {
    const [totalReferrals, completed, pending] = await Promise.all([
      this.prisma.referral.count({ where: { referrerId: userId } }),
      this.prisma.referral.count({ where: { referrerId: userId, status: 'completed' } }),
      this.prisma.referral.count({ where: { referrerId: userId, status: 'pending' } }),
    ]);

    const completedReferrals = await this.prisma.referral.findMany({
      where: { referrerId: userId, status: 'completed' },
      select: { rewardPaise: true, rewardPoints: true },
    });

    const totalRewardPaise = completedReferrals.reduce((sum, r) => sum + r.rewardPaise, 0);
    const totalRewardPoints = completedReferrals.reduce((sum, r) => sum + r.rewardPoints, 0);

    return {
      totalReferrals,
      completed,
      pending,
      conversionRate: totalReferrals > 0 ? Math.round((completed / totalReferrals) * 100) : 0,
      totalRewardPaise,
      totalRewardPoints,
    };
  }

  async getReferralAnalytics() {
    const [totalCodes, totalReferrals, completedReferrals, recentReferrals] = await Promise.all([
      this.prisma.referralCode.count(),
      this.prisma.referral.count(),
      this.prisma.referral.count({ where: { status: 'completed' } }),
      this.prisma.referral.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          referrer: { select: { id: true, username: true, displayName: true } },
          referee: { select: { id: true, username: true, displayName: true } },
        },
      }),
    ]);

    return {
      totalCodes,
      totalReferrals,
      completedReferrals,
      conversionRate: totalReferrals > 0 ? Math.round((completedReferrals / totalReferrals) * 100) : 0,
      recentReferrals,
    };
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }
}
