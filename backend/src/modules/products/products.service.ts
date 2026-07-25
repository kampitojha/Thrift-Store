import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { uniqueSlug } from '../../common/utils/slug';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../config/redis.module';
import { SearchService } from '../search/search.service';
import { CreateProductDto, UpdateProductDto, SearchProductsDto } from './dto/product.dto';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

const productCardSelect = {
  id: true,
  title: true,
  slug: true,
  pricePaise: true,
  originalPricePaise: true,
  condition: true,
  status: true,
  size: true,
  color: true,
  city: true,
  favoriteCount: true,
  viewCount: true,
  createdAt: true,
  brand: { select: { id: true, name: true, slug: true } },
  media: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true, thumbUrl: true },
  },
  seller: {
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      isVerified: true,
      displayName: true,
    },
  },
} satisfies Prisma.ProductSelect;

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly searchService: SearchService,
  ) {}

  async create(sellerId: string, dto: CreateProductDto) {
    const slug = uniqueSlug(dto.title);
    const status: ProductStatus = dto.publish ? 'ACTIVE' : 'DRAFT';

    const product = await this.prisma.product.create({
      data: {
        sellerId,
        title: dto.title,
        slug,
        description: dto.description,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        gender: dto.gender,
        condition: dto.condition,
        color: dto.color,
        material: dto.material,
        size: dto.size,
        weightGrams: dto.weightGrams,
        pricePaise: dto.pricePaise,
        originalPricePaise: dto.originalPricePaise,
        quantity: dto.quantity ?? 1,
        tags: dto.tags ?? [],
        allowsPickup: dto.allowsPickup ?? false,
        allowsShipping: dto.allowsShipping ?? true,
        returnPolicyDays: dto.returnPolicyDays ?? 7,
        city: dto.city,
        state: dto.state,
        country: dto.country ?? 'IN',
        status,
        publishedAt: dto.publish ? new Date() : null,
        media: {
          create: dto.mediaUrls.map((url, i) => ({
            url,
            isPrimary: i === 0,
            sortOrder: i,
            altText: dto.title,
          })),
        },
      },
      include: {
        media: true,
        brand: true,
        category: true,
      },
    });

    // Ensure seller role
    await this.prisma.user.updateMany({
      where: { id: sellerId, role: 'BUYER' },
      data: { role: 'SELLER' },
    });

    if (product.status === 'ACTIVE' || product.status === 'PENDING_REVIEW') {
      await this.searchService.indexProduct(product.id).catch((e) =>
        this.logger.warn(`Index failed: ${e.message}`),
      );
    }

    return product;
  }

  async findBySlug(slug: string, viewerId?: string) {
    const cacheKey = `product:slug:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached && !viewerId) return cached;

    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        brand: true,
        category: { select: { id: true, name: true, slug: true, parentId: true } },
        seller: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            city: true,
            country: true,
            bio: true,
            profile: { select: { averageRating: true, itemsSold: true, totalReviews: true } },
            sellerProfile: {
              select: {
                storeName: true,
                storeSlug: true,
                verificationStatus: true,
                rating: true,
                totalSales: true,
              },
            },
          },
        },
        _count: { select: { reviews: true, wishlistItems: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    if (
      product.status !== 'ACTIVE' &&
      product.sellerId !== viewerId
    ) {
      throw new NotFoundException('Product not found');
    }

    // Fire-and-forget view count
    this.recordView(product.id, viewerId).catch(() => undefined);

    if (product.status === 'ACTIVE') {
      await this.redis.set(cacheKey, product, 60);
    }

    return product;
  }

  async search(dto: SearchProductsDto) {
    try {
      const meili = await this.searchService.searchProducts(dto);
      if (meili && meili.data.length > 0) return meili;
    } catch (e) {
      this.logger.warn(`Meili fallback to Prisma: ${(e as Error).message}`);
    }

    return this.searchPrisma(dto);
  }

  private async searchPrisma(dto: SearchProductsDto) {
    const { skip, take, page, limit } = paginate(dto.page, dto.limit);
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (dto.q) {
      where.OR = [
        { title: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
        { tags: { has: dto.q.toLowerCase() } },
      ];
    }
    if (dto.category) {
      where.OR = undefined;
      where.category = {
        OR: [{ slug: dto.category }, { parent: { slug: dto.category } }],
      };
    }
    if (dto.brand) where.brand = { slug: dto.brand };
    if (dto.condition) {
      const conditions = dto.condition.split(',') as Prisma.EnumProductConditionFilter['in'];
      where.condition = { in: conditions as never };
    }
    if (dto.gender) where.gender = dto.gender as never;
    if (dto.color) where.color = { contains: dto.color, mode: 'insensitive' };
    if (dto.size) where.size = { equals: dto.size, mode: 'insensitive' };
    if (dto.city) where.city = { contains: dto.city, mode: 'insensitive' };
    if (dto.sellerId) where.sellerId = dto.sellerId;
    if (dto.minPrice || dto.maxPrice) {
      where.pricePaise = {};
      if (dto.minPrice) where.pricePaise.gte = dto.minPrice;
      if (dto.maxPrice) where.pricePaise.lte = dto.maxPrice;
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (dto.sort) {
        case 'oldest':
          return { publishedAt: 'asc' };
        case 'price_asc':
          return { pricePaise: 'asc' };
        case 'price_desc':
          return { pricePaise: 'desc' };
        case 'popular':
          return { favoriteCount: 'desc' };
        case 'trending':
          return { viewCount: 'desc' };
        default:
          return { publishedAt: 'desc' };
      }
    })();

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy,
        select: productCardSelect,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: items.map(this.toCard),
      meta: paginationMeta(total, page, limit),
    };
  }

  async update(sellerId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId) throw new ForbiddenException();

    const { mediaUrls, publish, ...rest } = dto;
    const data: Prisma.ProductUpdateInput = { ...rest };

    if (publish && product.status === 'DRAFT') {
      data.status = 'PENDING_REVIEW';
      data.publishedAt = new Date();
    }

    if (mediaUrls?.length) {
      await this.prisma.productMedia.deleteMany({ where: { productId: id } });
      data.media = {
        create: mediaUrls.map((url, i) => ({
          url,
          isPrimary: i === 0,
          sortOrder: i,
        })),
      };
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data,
      include: { media: true, brand: true, category: true },
    });

    await this.redis.del(`product:slug:${updated.slug}`);
    await this.searchService.indexProduct(id).catch(() => undefined);

    return updated;
  }

  async remove(sellerId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id } });
    if (!product) throw new NotFoundException();
    if (product.sellerId !== sellerId) throw new ForbiddenException();

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
    await this.searchService.removeProduct(id).catch(() => undefined);
    return { ok: true };
  }

  async myListings(sellerId: string, page = 1, limit = 24, status?: string) {
    const { skip, take } = paginate(page, limit);
    const where: Prisma.ProductWhereInput = {
      sellerId,
      deletedAt: null,
      ...(status ? { status: status as ProductStatus } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        select: productCardSelect,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: items.map(this.toCard),
      meta: paginationMeta(total, page, take),
    };
  }

  async related(productId: string, limit = 8) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return [];

    const items = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        id: { not: productId },
        OR: [
          { categoryId: product.categoryId },
          { brandId: product.brandId ?? undefined },
          { tags: { hasSome: product.tags.slice(0, 5) } },
        ],
      },
      take: limit,
      orderBy: { viewCount: 'desc' },
      select: productCardSelect,
    });

    return items.map(this.toCard);
  }

  private async recordView(productId: string, userId?: string) {
    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: productId },
        data: { viewCount: { increment: 1 } },
      }),
      this.prisma.productView.create({
        data: { productId, userId },
      }),
    ]);
  }

  private toCard = (p: {
    id: string;
    title: string;
    slug: string;
    pricePaise: number;
    originalPricePaise: number | null;
    condition: string;
    status: string;
    size: string | null;
    color: string | null;
    city: string | null;
    favoriteCount: number;
    createdAt: Date;
    brand: { name: string } | null;
    media: Array<{ url: string; thumbUrl: string | null }>;
    seller: {
      id: string;
      username: string;
      avatarUrl: string | null;
      isVerified: boolean;
    };
  }) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    pricePaise: p.pricePaise,
    originalPricePaise: p.originalPricePaise,
    condition: p.condition,
    status: p.status,
    size: p.size,
    color: p.color,
    city: p.city,
    favoriteCount: p.favoriteCount,
    thumbnailUrl: p.media[0]?.thumbUrl || p.media[0]?.url || null,
    brandName: p.brand?.name ?? null,
    seller: p.seller,
    createdAt: p.createdAt.toISOString(),
  });
}
