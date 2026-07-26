import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class SavedSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    data: { query: string; filters?: Record<string, unknown>; alertOn?: boolean },
  ) {
    return this.prisma.savedSearch.create({
      data: {
        userId,
        query: data.query,
        filters: (data.filters as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        alertOn: data.alertOn ?? false,
      },
    });
  }

  async findAll(userId: string, page = 1, limit = 50) {
    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.savedSearch.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.savedSearch.count({ where: { userId } }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async update(
    userId: string,
    id: string,
    data: { query?: string; filters?: Record<string, unknown>; alertOn?: boolean },
  ) {
    await this.assertOwner(userId, id);
    return this.prisma.savedSearch.update({
      where: { id },
      data: {
        ...data,
        filters: data.filters ? (data.filters as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  async delete(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.savedSearch.delete({ where: { id } });
    return { ok: true };
  }

  async toggleAlert(userId: string, id: string) {
    const search = await this.assertOwner(userId, id);
    return this.prisma.savedSearch.update({
      where: { id },
      data: { alertOn: !search.alertOn },
    });
  }

  private async assertOwner(userId: string, id: string) {
    const search = await this.prisma.savedSearch.findUnique({ where: { id } });
    if (!search) throw new NotFoundException('Saved search not found');
    if (search.userId !== userId) throw new ForbiddenException('Not your saved search');
    return search;
  }
}
