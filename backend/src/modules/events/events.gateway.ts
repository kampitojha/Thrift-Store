import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(EventsGateway.name);
  private onlineUsers = new Map<string, Set<string>>();
  private userSockets = new Map<string, string>();
  private typingTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwt.verifyAsync(token);
      client.userId = payload.sub;
      client.username = payload.username;

      if (!this.onlineUsers.has(payload.sub)) {
        this.onlineUsers.set(payload.sub, new Set());
      }
      this.onlineUsers.get(payload.sub)!.add(client.id);
      this.userSockets.set(client.id, payload.sub);

      client.join(`user:${payload.sub}`);

      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { lastSeenAt: new Date() },
      }).catch(() => {});

      this.server.emit('user:online', { userId: payload.sub, online: true });
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.onlineUsers.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(client.userId);
          await this.prisma.user.update({
            where: { id: client.userId },
            data: { lastSeenAt: new Date() },
          }).catch(() => {});
          this.server.emit('user:online', { userId: client.userId, online: false, lastSeenAt: new Date() });
        }
      }
      this.userSockets.delete(client.id);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; body?: string; mediaUrl?: string; offerId?: string },
  ) {
    if (!client.userId) return;

    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: data.conversationId, userId: client.userId } },
    });
    if (!participant) return;

    const message = await this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: client.userId,
        body: data.body,
        mediaUrl: data.mediaUrl,
        offerId: data.offerId,
      },
      include: { sender: { select: { id: true, username: true, avatarUrl: true, displayName: true } } },
    });

    await this.prisma.conversation.update({
      where: { id: data.conversationId },
      data: { lastMessageAt: new Date() },
    });

    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: data.conversationId },
    });

    for (const p of participants) {
      this.server.to(`user:${p.userId}`).emit('message:new', {
        conversationId: data.conversationId,
        message,
      });
    }

    return { ok: true, message };
  }

  @SubscribeMessage('message:read')
  async handleRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId?: string },
  ) {
    if (!client.userId) return;

    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId: data.conversationId, userId: client.userId },
      data: { lastReadAt: new Date() },
    });

    if (data.messageId) {
      await this.prisma.message.updateMany({
        where: { id: data.messageId, conversationId: data.conversationId, NOT: { senderId: client.userId } },
        data: { readAt: new Date() },
      });
    }

    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: data.conversationId },
    });

    for (const p of participants) {
      if (p.userId !== client.userId) {
        this.server.to(`user:${p.userId}`).emit('message:read', {
          conversationId: data.conversationId,
          readBy: client.userId,
          messageId: data.messageId,
          readAt: new Date(),
        });
      }
    }

    return { ok: true };
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;

    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: data.conversationId },
    });

    for (const p of participants) {
      if (p.userId !== client.userId) {
        this.server.to(`user:${p.userId}`).emit('typing:start', {
          conversationId: data.conversationId,
          userId: client.userId,
          username: client.username,
        });
      }
    }

    const key = `${client.userId}:${data.conversationId}`;
    if (this.typingTimers.has(key)) {
      clearTimeout(this.typingTimers.get(key));
    }
    this.typingTimers.set(key, setTimeout(() => {
      for (const p of participants) {
        if (p.userId !== client.userId) {
          this.server.to(`user:${p.userId}`).emit('typing:stop', {
            conversationId: data.conversationId,
            userId: client.userId,
          });
        }
      }
      this.typingTimers.delete(key);
    }, 3000));
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;

    const key = `${client.userId}:${data.conversationId}`;
    if (this.typingTimers.has(key)) {
      clearTimeout(this.typingTimers.get(key));
      this.typingTimers.delete(key);
    }

    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: data.conversationId },
    });

    for (const p of participants) {
      if (p.userId !== client.userId) {
        this.server.to(`user:${p.userId}`).emit('typing:stop', {
          conversationId: data.conversationId,
          userId: client.userId,
        });
      }
    }
  }

  @SubscribeMessage('user:status')
  async handleStatusCheck(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    const isOnline = this.onlineUsers.has(data.userId);
    return { userId: data.userId, online: isOnline };
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  isOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}
