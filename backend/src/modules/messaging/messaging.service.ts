import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  async startConversation(userId: string, otherUserId: string, productId?: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        productId: productId ?? null,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      include: { participants: true },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        productId,
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: { participants: true },
    });
  }

  async listConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, displayName: true },
            },
          },
        },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      take: 50,
    });
  }

  async searchConversations(userId: string, query: string) {
    return this.prisma.conversation.findMany({
      where: {
        AND: [
          { participants: { some: { userId } } },
          {
            participants: {
              some: {
                user: {
                  OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { displayName: { contains: query, mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
        ],
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, displayName: true },
            },
          },
        },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      take: 20,
    });
  }

  async searchMessages(userId: string, conversationId: string, query: string) {
    await this.assertParticipant(userId, conversationId);

    return this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        body: { contains: query, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }

  async getMessages(userId: string, conversationId: string, cursor?: string) {
    await this.assertParticipant(userId, conversationId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });

    return messages.reverse();
  }

  async send(
    userId: string,
    conversationId: string,
    body?: string,
    mediaUrl?: string,
    offerId?: string,
  ) {
    await this.assertParticipant(userId, conversationId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body,
        mediaUrl,
        offerId,
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  async toggleMute(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Not a participant');

    const updated = await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { isMuted: !participant.isMuted },
    });
    return { muted: updated.isMuted };
  }

  async togglePin(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Not a participant');

    const updated = await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { isPinned: !participant.isPinned },
    });
    return { pinned: updated.isPinned };
  }

  async archiveConversation(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Not a participant');

    const updated = await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { isArchived: !participant.isArchived },
    });
    return { archived: updated.isArchived };
  }

  async deleteConversation(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);
    await this.prisma.message.updateMany({
      where: { conversationId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  async getUnreadCount(userId: string) {
    const result = await this.prisma.conversationParticipant.aggregate({
      where: {
        userId,
        conversation: {
          messages: {
            some: {
              deletedAt: null,
              NOT: { senderId: userId },
              createdAt: { gt: undefined },
            },
          },
        },
      },
      _count: true,
    });

    const conversations = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            messages: {
              where: {
                deletedAt: null,
                NOT: { senderId: userId },
              },
              select: { id: true, createdAt: true, readAt: true },
            },
          },
        },
      },
    });

    let total = 0;
    for (const c of conversations) {
      const readAt = c.lastReadAt ?? new Date(0);
      const unread = c.conversation.messages.filter(
        (m) => !m.readAt && m.createdAt > readAt,
      ).length;
      total += unread;
    }
    return { unread: total };
  }

  async getOnlineStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastSeenAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
    const online = user.lastSeenAt ? user.lastSeenAt > twoMinAgo : false;
    return { userId, online, lastSeenAt: user.lastSeenAt };
  }

  private async assertParticipant(userId: string, conversationId: string) {
    const p = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!p) throw new ForbiddenException('Not a participant');
  }
}
