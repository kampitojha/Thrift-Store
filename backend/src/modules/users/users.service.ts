import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

const DEFAULT_NOTIF_PREFS = {
  email: { marketing: false, orderUpdates: true, messages: true, sellerAlerts: true },
  push: { messages: true, orderUpdates: true, favorites: false },
  sms: { orderUpdates: false, marketing: false },
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        city: true,
        state: true,
        country: true,
        isVerified: true,
        role: true,
        socialLinks: true,
        createdAt: true,
        profile: true,
        sellerProfile: {
          select: {
            storeName: true,
            storeSlug: true,
            storeDescription: true,
            storeLogoUrl: true,
            storeBannerUrl: true,
            verificationStatus: true,
            rating: true,
            totalSales: true,
          },
        },
        _count: {
          select: {
            followers: true,
            follows: true,
            products: true,
          },
        },
      },
    });
    if (!user || user.role === 'GUEST') throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const taken = await this.prisma.user.findFirst({
        where: {
          username: dto.username.toLowerCase(),
          NOT: { id: userId },
        },
      });
      if (taken) throw new ConflictException('Username taken');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        coverUrl: dto.coverUrl,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        socialLinks: dto.socialLinks,
        username: dto.username?.toLowerCase(),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        city: true,
        state: true,
        country: true,
        socialLinks: true,
      },
    });
  }

  async follow(followerId: string, username: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.id === followerId) throw new BadRequestException('Cannot follow yourself');

    await this.prisma.follow.upsert({
      where: {
        followerId_followingId: { followerId, followingId: target.id },
      },
      create: { followerId, followingId: target.id },
      update: {},
    });

    return { following: true };
  }

  async unfollow(followerId: string, username: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!target) throw new NotFoundException('User not found');

    await this.prisma.follow.deleteMany({
      where: { followerId, followingId: target.id },
    });

    return { following: false };
  }

  async getFollowers(username: string, page = 1, limit = 24) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!user) throw new NotFoundException('User not found');

    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followingId: user.id },
        skip,
        take,
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.follow.count({ where: { followingId: user.id } }),
    ]);

    return {
      data: items.map((i) => i.follower),
      meta: paginationMeta(total, page, take),
    };
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // ── Notification Preferences ──

  async getNotificationPrefs(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });
    const meta = (user?.metadata as Record<string, unknown>) || {};
    return (meta.notificationPrefs as Record<string, unknown>) || DEFAULT_NOTIF_PREFS;
  }

  async updateNotificationPrefs(userId: string, prefs: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });
    const meta = (user?.metadata as Record<string, unknown>) || {};
    await this.prisma.user.update({
      where: { id: userId },
      data: { metadata: { ...meta, notificationPrefs: prefs } as any },
    });
    return { ok: true };
  }

  // ── Privacy Settings ──

  async getPrivacySettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });
    const meta = (user?.metadata as Record<string, unknown>) || {};
    const privacy = (meta.privacySettings as Record<string, unknown>) || {};
    return {
      profileVisibility: (privacy.profileVisibility as string) || 'public',
      showLikes: (privacy.showLikes as boolean) ?? true,
      showSoldItems: (privacy.showSoldItems as boolean) ?? true,
      blockedUsers: (privacy.blockedUsers as string[]) || [],
    };
  }

  async updatePrivacySettings(userId: string, settings: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });
    const meta = (user?.metadata as Record<string, unknown>) || {};
    const privacy = (meta.privacySettings as Record<string, unknown>) || {};
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...meta,
          privacySettings: { ...privacy, ...settings },
        } as any,
      },
    });
    return { ok: true };
  }

  // ── Block/Unblock ──

  async blockUser(userId: string, username: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.id === userId) throw new BadRequestException('Cannot block yourself');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });
    const meta = (user?.metadata as Record<string, unknown>) || {};
    const privacy = (meta.privacySettings as Record<string, unknown>) || {};
    const blocked: string[] = (privacy.blockedUsers as string[]) || [];
    if (!blocked.includes(target.id)) {
      blocked.push(target.id);
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...meta,
          privacySettings: { ...privacy, blockedUsers: blocked },
        } as any,
      },
    });
    return { blocked: true };
  }

  async unblockUser(userId: string, username: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!target) throw new NotFoundException('User not found');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });
    const meta = (user?.metadata as Record<string, unknown>) || {};
    const privacy = (meta.privacySettings as Record<string, unknown>) || {};
    const blocked: string[] = ((privacy.blockedUsers as string[]) || []).filter(
      (id: string) => id !== target.id,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...meta,
          privacySettings: { ...privacy, blockedUsers: blocked },
        } as any,
      },
    });
    return { unblocked: true };
  }

  // ── Account Deletion ──

  async deleteAccount(userId: string, reason?: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        email: `deleted_${userId}@reloom.in`,
        username: `deleted_${userId}`,
        passwordHash: null,
        metadata: reason ? { ...(await this.getMetadata(userId)), deleteReason: reason } : undefined,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'ACCOUNT_DELETED',
        metadata: reason ? { reason } : undefined,
      },
    });
    return { ok: true };
  }

  private async getMetadata(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });
    return ((user?.metadata as Record<string, unknown>) || {}) as Record<string, unknown>;
  }

  async addAddress(userId: string, data: Record<string, unknown>) {
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({
      data: {
        userId,
        fullName: data.fullName as string,
        phone: data.phone as string,
        line1: data.line1 as string,
        line2: data.line2 as string | undefined,
        city: data.city as string,
        state: data.state as string,
        postalCode: data.postalCode as string,
        country: (data.country as string) || 'IN',
        label: data.label as string | undefined,
        isDefault: Boolean(data.isDefault),
        isBilling: Boolean(data.isBilling),
      },
    });
  }
}
