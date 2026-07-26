import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    data: { name: string; description?: string; coverUrl?: string; isPublic?: boolean },
  ) {
    const slug = this.slugify(data.name);
    const existing = await this.prisma.collection.findFirst({
      where: { userId, slug },
    });
    if (existing) throw new ConflictException('A collection with this name already exists');

    return this.prisma.collection.create({
      data: {
        userId,
        name: data.name,
        slug,
        description: data.description,
        coverUrl: data.coverUrl,
        isPublic: data.isPublic ?? true,
      },
    });
  }

  async findAll(userId: string, page = 1, limit = 24) {
    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.collection.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { items: true } },
        },
      }),
      this.prisma.collection.count({ where: { userId } }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  async findOne(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                title: true,
                pricePaise: true,
                status: true,
                slug: true,
              },
            },
          },
        },
        _count: { select: { items: true } },
      },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    if (!collection.isPublic && collection.userId !== userId) {
      throw new ForbiddenException('This collection is private');
    }
    return collection;
  }

  async findBySlug(userId: string, username: string, slug: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const collection = await this.prisma.collection.findFirst({
      where: { userId: user.id, slug },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                title: true,
                pricePaise: true,
                status: true,
                slug: true,
              },
            },
          },
        },
        _count: { select: { items: true } },
      },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    if (!collection.isPublic && collection.userId !== userId) {
      throw new ForbiddenException('This collection is private');
    }
    return collection;
  }

  async update(
    userId: string,
    collectionId: string,
    data: { name?: string; description?: string; coverUrl?: string; isPublic?: boolean },
  ) {
    const collection = await this.assertOwner(userId, collectionId);
    const updateData: Record<string, unknown> = { ...data };
    if (data.name) {
      updateData.slug = this.slugify(data.name);
    }
    return this.prisma.collection.update({
      where: { id: collectionId },
      data: updateData,
    });
  }

  async delete(userId: string, collectionId: string) {
    await this.assertOwner(userId, collectionId);
    await this.prisma.collection.delete({ where: { id: collectionId } });
    return { ok: true };
  }

  async addItem(userId: string, collectionId: string, productId: string) {
    await this.assertOwner(userId, collectionId);
    const existing = await this.prisma.collectionItem.findUnique({
      where: { collectionId_productId: { collectionId, productId } },
    });
    if (existing) throw new ConflictException('Product already in collection');

    const maxOrder = await this.prisma.collectionItem.aggregate({
      where: { collectionId },
      _max: { sortOrder: true },
    });

    return this.prisma.collectionItem.create({
      data: {
        collectionId,
        productId,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            pricePaise: true,
            slug: true,
          },
        },
      },
    });
  }

  async removeItem(userId: string, collectionId: string, productId: string) {
    await this.assertOwner(userId, collectionId);
    const item = await this.prisma.collectionItem.findUnique({
      where: { collectionId_productId: { collectionId, productId } },
    });
    if (!item) throw new NotFoundException('Item not in collection');

    await this.prisma.collectionItem.delete({
      where: { collectionId_productId: { collectionId, productId } },
    });
    return { ok: true };
  }

  async reorderItems(userId: string, collectionId: string, itemIds: string[]) {
    await this.assertOwner(userId, collectionId);
    await this.prisma.$transaction(
      itemIds.map((id, idx) =>
        this.prisma.collectionItem.update({
          where: { id },
          data: { sortOrder: idx },
        }),
      ),
    );
    return { ok: true };
  }

  async togglePublic(userId: string, collectionId: string) {
    const collection = await this.assertOwner(userId, collectionId);
    return this.prisma.collection.update({
      where: { id: collectionId },
      data: { isPublic: !collection.isPublic },
    });
  }

  async publicCollections(username: string, page = 1, limit = 24) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.collection.findMany({
        where: { userId: user.id, isPublic: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.collection.count({ where: { userId: user.id, isPublic: true } }),
    ]);
    return { data: items, meta: paginationMeta(total, page, take) };
  }

  private async assertOwner(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    if (collection.userId !== userId) throw new ForbiddenException('Not your collection');
    return collection;
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
