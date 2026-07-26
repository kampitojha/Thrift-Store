import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 24, opts?: { status?: string; priority?: string; assigneeId?: string }) {
    const p = paginate(page, limit);
    const where: any = {};
    if (opts?.status) where.status = opts.status;
    if (opts?.priority) where.priority = opts.priority;
    if (opts?.assigneeId) where.assigneeId = opts.assigneeId;
    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true, email: true } },
          _count: { select: { messages: true } },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return {
      items: items.map((t) => ({
        ...t,
        messageCount: t._count.messages,
        _count: undefined,
      })),
      meta: paginationMeta(total, p.page, p.limit),
    };
  }

  async get(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, email: true } },
        assignee: { select: { id: true, username: true, displayName: true } },
        messages: {
          include: {
            sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return ticket;
  }

  async create(data: {
    userId: string;
    subject: string;
    description: string;
    category?: string;
    orderId?: string;
    priority?: string;
  }) {
    return this.prisma.supportTicket.create({
      data: {
        userId: data.userId,
        subject: data.subject,
        description: data.description,
        category: data.category,
        orderId: data.orderId,
        priority: (data.priority as any) || 'MEDIUM',
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async sendMessage(
    ticketId: string,
    senderId: string,
    body: string,
    isStaff = false,
  ) {
    const ticket = await this.get(ticketId);
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('Cannot send messages to a closed ticket');
    }
    const message = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId,
        senderId,
        body,
        isStaff,
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
    // Update ticket status to OPEN if it was resolved
    if (ticket.status !== 'OPEN') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'OPEN' },
      });
    }
    return message;
  }

  async assign(ticketId: string, assigneeId: string) {
    await this.get(ticketId);
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assigneeId, status: 'IN_PROGRESS' },
    });
  }

  async resolve(ticketId: string) {
    await this.get(ticketId);
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'RESOLVED', closedAt: new Date() },
    });
  }

  async close(ticketId: string) {
    await this.get(ticketId);
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  async reopen(ticketId: string) {
    await this.get(ticketId);
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'OPEN', closedAt: null },
    });
  }

  async myTickets(userId: string, page = 1, limit = 24) {
    const p = paginate(page, limit);
    const where = { userId };
    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return {
      items: items.map((t) => ({
        ...t,
        messageCount: t._count.messages,
        _count: undefined,
      })),
      meta: paginationMeta(total, p.page, p.limit),
    };
  }

  async stats() {
    const [total, open, inProgress, resolved, closed] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      this.prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
    ]);
    return { total, open, inProgress, resolved, closed };
  }
}
