import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index } from 'meilisearch';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../config/redis.module';
import { SearchProductsDto } from '../products/dto/product.dto';
import { paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch | null = null;
  private index: Index | null = null;
  private ready = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    try {
      const host = this.config.get<string>('meiliHost');
      const key = this.config.get<string>('meiliMasterKey');
      if (!host) return;

      this.client = new MeiliSearch({ host, apiKey: key });
      const indexName = this.config.get<string>('meiliIndexProducts') || 'products';
      this.index = this.client.index(indexName);

      await this.client.createIndex(indexName, { primaryKey: 'id' }).catch(() => undefined);
      await this.index.updateSettings({
        searchableAttributes: ['title', 'description', 'tags', 'brandName', 'categoryName', 'sellerUsername'],
        filterableAttributes: [
          'status',
          'categorySlug',
          'brandSlug',
          'condition',
          'gender',
          'color',
          'size',
          'city',
          'sellerId',
          'pricePaise',
        ],
        sortableAttributes: ['pricePaise', 'publishedAt', 'viewCount', 'favoriteCount'],
        rankingRules: [
          'words',
          'typo',
          'proximity',
          'attribute',
          'sort',
          'exactness',
          'viewCount:desc',
        ],
        synonyms: {
          sneakers: ['trainers', 'kicks', 'shoes'],
          thrift: ['secondhand', 'preloved', 'used'],
          bag: ['handbag', 'purse', 'tote'],
        },
      });
      this.ready = true;
      this.logger.log('Meilisearch products index ready');
    } catch (e) {
      this.logger.warn(`Meilisearch unavailable: ${(e as Error).message}`);
      this.ready = false;
    }
  }

  async searchProducts(dto: SearchProductsDto) {
    if (!this.ready || !this.index) return null;

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 24;
    const filters: string[] = ['status = ACTIVE'];

    if (dto.category) filters.push(`categorySlug = "${dto.category}"`);
    if (dto.brand) filters.push(`brandSlug = "${dto.brand}"`);
    if (dto.condition) {
      const parts = dto.condition.split(',').map((c) => `condition = "${c}"`);
      filters.push(`(${parts.join(' OR ')})`);
    }
    if (dto.gender) filters.push(`gender = "${dto.gender}"`);
    if (dto.color) filters.push(`color = "${dto.color}"`);
    if (dto.size) filters.push(`size = "${dto.size}"`);
    if (dto.city) filters.push(`city = "${dto.city}"`);
    if (dto.sellerId) filters.push(`sellerId = "${dto.sellerId}"`);
    if (dto.minPrice != null) filters.push(`pricePaise >= ${dto.minPrice}`);
    if (dto.maxPrice != null) filters.push(`pricePaise <= ${dto.maxPrice}`);

    const sortMap: Record<string, string[]> = {
      newest: ['publishedAt:desc'],
      oldest: ['publishedAt:asc'],
      price_asc: ['pricePaise:asc'],
      price_desc: ['pricePaise:desc'],
      popular: ['favoriteCount:desc'],
      trending: ['viewCount:desc'],
    };

    const result = await this.index.search(dto.q || '', {
      filter: filters.join(' AND '),
      sort: sortMap[dto.sort || 'newest'] || sortMap.newest,
      limit,
      offset: (page - 1) * limit,
      attributesToHighlight: ['title'],
    });

    // Track recent searches
    if (dto.q) {
      await this.redis.client
        .zincrby('reloom:trending_searches', 1, dto.q.toLowerCase().slice(0, 100))
        .catch(() => undefined);
    }

    return {
      data: result.hits,
      meta: paginationMeta(result.estimatedTotalHits ?? result.hits.length, page, limit),
      processingTimeMs: result.processingTimeMs,
    };
  }

  async autocomplete(q: string) {
    if (!this.ready || !this.index || !q) return [];
    const result = await this.index.search(q, {
      limit: 8,
      attributesToRetrieve: ['id', 'title', 'slug', 'thumbnailUrl', 'pricePaise'],
      filter: 'status = ACTIVE',
    });
    return result.hits;
  }

  async trendingSearches(limit = 10) {
    try {
      const items = await this.redis.client.zrevrange(
        'reloom:trending_searches',
        0,
        limit - 1,
        'WITHSCORES',
      );
      const out: Array<{ query: string; score: number }> = [];
      for (let i = 0; i < items.length; i += 2) {
        out.push({ query: items[i], score: Number(items[i + 1]) });
      }
      return out;
    } catch {
      return [];
    }
  }

  async indexProduct(productId: string) {
    if (!this.ready || !this.index) return;

    const p = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: true,
        category: true,
        media: { where: { isPrimary: true }, take: 1 },
        seller: { select: { id: true, username: true, avatarUrl: true, isVerified: true } },
      },
    });
    if (!p) return;

    await this.index.addDocuments([
      {
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description.slice(0, 500),
        pricePaise: p.pricePaise,
        originalPricePaise: p.originalPricePaise,
        condition: p.condition,
        status: p.status,
        gender: p.gender,
        color: p.color,
        size: p.size,
        city: p.city,
        tags: p.tags,
        brandName: p.brand?.name,
        brandSlug: p.brand?.slug,
        categoryName: p.category.name,
        categorySlug: p.category.slug,
        sellerId: p.sellerId,
        sellerUsername: p.seller.username,
        seller: p.seller,
        thumbnailUrl: p.media[0]?.url ?? null,
        viewCount: p.viewCount,
        favoriteCount: p.favoriteCount,
        publishedAt: p.publishedAt?.getTime() ?? p.createdAt.getTime(),
        createdAt: p.createdAt.toISOString(),
      },
    ]);
  }

  async removeProduct(productId: string) {
    if (!this.ready || !this.index) return;
    await this.index.deleteDocument(productId);
  }

  async reindexAll() {
    if (!this.ready || !this.index) return { indexed: 0 };

    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });

    for (const p of products) {
      await this.indexProduct(p.id);
    }

    return { indexed: products.length };
  }
}
