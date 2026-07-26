import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 24) {
    const p = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.featureFlag.findMany({
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.featureFlag.count(),
    ]);
    return { items, meta: paginationMeta(total, p.page, p.limit) };
  }

  async get(id: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException('Feature flag not found');
    return flag;
  }

  async getByKey(key: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new NotFoundException('Feature flag not found');
    return flag;
  }

  async create(data: { key: string; description?: string; enabled?: boolean; rolloutPct?: number; rules?: any }) {
    return this.prisma.featureFlag.create({ data });
  }

  async update(id: string, data: Record<string, any>) {
    await this.get(id);
    return this.prisma.featureFlag.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.get(id);
    await this.prisma.featureFlag.delete({ where: { id } });
  }

  async toggle(id: string) {
    const flag = await this.get(id);
    return this.prisma.featureFlag.update({
      where: { id },
      data: { enabled: !flag.enabled },
    });
  }

  async checkEnabled(key: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag || !flag.enabled) return false;
    if (flag.rolloutPct < 100) {
      return Math.random() * 100 < flag.rolloutPct;
    }
    return true;
  }

  async getAllEnabled() {
    const flags = await this.prisma.featureFlag.findMany({
      where: { enabled: true },
    });
    const result: Record<string, boolean> = {};
    for (const flag of flags) {
      result[flag.key] = flag.rolloutPct >= 100 || Math.random() * 100 < flag.rolloutPct;
    }
    return result;
  }
}
