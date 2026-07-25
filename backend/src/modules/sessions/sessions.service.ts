import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    return {
      data: sessions.map((s) => ({
        id: s.id,
        deviceName: s.userAgent ? this.parseDevice(s.userAgent) : 'Unknown',
        browser: s.userAgent ? this.parseBrowser(s.userAgent) : undefined,
        os: s.userAgent ? this.parseOS(s.userAgent) : undefined,
        ipAddress: s.ipAddress,
        isCurrent: false,
        lastUsedAt: s.createdAt,
        createdAt: s.createdAt,
      })),
    };
  }

  async revoke(userId: string, sessionId: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new ForbiddenException('Session not found');
    }
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async revokeOthers(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private parseDevice(ua: string): string {
    if (/mobile|android|iphone|ipad/i.test(ua)) return 'Mobile Device';
    if (/tablet|ipad/i.test(ua)) return 'Tablet';
    return 'Desktop Browser';
  }

  private parseBrowser(ua: string): string {
    if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) return 'Chrome';
    if (/firefox/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
    if (/edge/i.test(ua)) return 'Edge';
    if (/opr/i.test(ua)) return 'Opera';
    return 'Unknown';
  }

  private parseOS(ua: string): string {
    if (/windows/i.test(ua)) return 'Windows';
    if (/macintosh|mac os/i.test(ua)) return 'macOS';
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ios/i.test(ua)) return 'iOS';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Unknown';
  }
}
