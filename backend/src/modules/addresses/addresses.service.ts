import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: {
    label?: string; fullName: string; phone: string; line1: string; line2?: string;
    city: string; state: string; postalCode: string; country?: string;
    isDefault?: boolean; isBilling?: boolean;
  }) {
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({
      data: { ...data, userId, country: data.country || 'IN' },
    });
  }

  async list(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const addr = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    return addr;
  }

  async update(userId: string, id: string, data: Record<string, unknown>) {
    const addr = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!addr) throw new NotFoundException('Address not found');

    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    const addr = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    await this.prisma.address.delete({ where: { id } });
    return { ok: true };
  }

  async setDefault(userId: string, id: string) {
    const addr = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
    return this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }
}
