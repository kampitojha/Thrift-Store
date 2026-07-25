import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  constructor(private readonly prisma: PrismaService) {}

  async isEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    return user?.twoFactorEnabled || false;
  }

  async getSecret(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });
    return user?.twoFactorSecret || null;
  }

  async enable(userId: string, secret: string): Promise<string[]> {
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        metadata: {
          ...(await this.getMetadata(userId)),
          backupCodes: backupCodes.map((c) => ({ code: c, used: false })),
        },
      },
    });

    return backupCodes;
  }

  async disable(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        metadata: {
          ...(await this.getMetadata(userId)),
          backupCodes: [],
        },
      },
    });
  }

  private async getMetadata(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });
    return ((user?.metadata as Record<string, unknown>) || {}) as Record<string, unknown>;
  }
}
