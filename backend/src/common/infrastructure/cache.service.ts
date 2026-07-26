import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT, RedisService } from '../../config/redis.module';

export interface CacheNamespace {
  prefix: string;
  ttl: number;
}

const DEFAULT_NAMESPACES: Record<string, CacheNamespace> = {
  product: { prefix: 'cache:product:', ttl: 900 },
  user: { prefix: 'cache:user:', ttl: 600 },
  category: { prefix: 'cache:category:', ttl: 3600 },
  session: { prefix: 'cache:session:', ttl: 1800 },
  search: { prefix: 'cache:search:', ttl: 300 },
  analytics: { prefix: 'cache:analytics:', ttl: 120 },
  geo: { prefix: 'cache:geo:', ttl: 86400 },
  config: { prefix: 'cache:config:', ttl: 300 },
};

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: import('ioredis').Redis,
    private readonly config: ConfigService,
  ) {}

  private ns(name: string): CacheNamespace {
    return DEFAULT_NAMESPACES[name] || { prefix: `cache:${name}:`, ttl: 300 };
  }

  private prefix(key: string): string {
    return `${this.config.get('redisPrefix') || 'reloom:'}${key}`;
  }

  async get<T>(namespace: string, key: string): Promise<T | null> {
    const fullKey = this.prefix(this.ns(namespace).prefix + key);
    const val = await this.redis.get(fullKey);
    if (val == null) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return val as T;
    }
  }

  async set<T>(namespace: string, key: string, value: T, ttlOverride?: number): Promise<void> {
    const ns = this.ns(namespace);
    const fullKey = this.prefix(ns.prefix + key);
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    const ttl = ttlOverride ?? ns.ttl;
    await this.redis.set(fullKey, payload, 'EX', ttl);
  }

  async delete(namespace: string, key: string): Promise<void> {
    const fullKey = this.prefix(this.ns(namespace).prefix + key);
    await this.redis.del(fullKey);
  }

  async invalidateByPattern(namespace: string, pattern: string): Promise<void> {
    const ns = this.ns(namespace);
    const keys = await this.redis.keys(this.prefix(ns.prefix + pattern));
    if (keys.length) {
      await this.redis.del(...keys);
    }
  }

  async invalidateNamespace(namespace: string): Promise<void> {
    const ns = this.ns(namespace);
    const keys = await this.redis.keys(this.prefix(ns.prefix + '*'));
    if (keys.length) {
      await this.redis.del(...keys);
    }
  }

  async getOrSet<T>(
    namespace: string,
    key: string,
    fetcher: () => Promise<T>,
    ttlOverride?: number,
  ): Promise<T> {
    const cached = await this.get<T>(namespace, key);
    if (cached !== null) return cached;
    const value = await fetcher();
    await this.set(namespace, key, value, ttlOverride);
    return value;
  }
}
