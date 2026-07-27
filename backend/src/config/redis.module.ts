import { Global, Module, OnModuleDestroy, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  private prefix(key: string) {
    return `${this.config.get('redisPrefix') || 'reloom:'}${key}`;
  }

  async get<T = string>(key: string): Promise<T | null> {
    try {
      const val = await this.redis.get(this.prefix(key));
      if (val == null) return null;
      try {
        return JSON.parse(val) as T;
      } catch {
        return val as T;
      }
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.set(this.prefix(key), payload, 'EX', ttlSeconds);
      } else {
        await this.redis.set(this.prefix(key), payload);
      }
    } catch {
      /* Redis unavailable — skip */
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(this.prefix(key));
    } catch {
      /* Redis unavailable — skip */
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(this.prefix(pattern));
      if (keys.length) await this.redis.del(...keys);
    } catch {
      /* Redis unavailable — skip */
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const n = await this.redis.incr(this.prefix(key));
      if (n === 1 && ttlSeconds) {
        await this.redis.expire(this.prefix(key), ttlSeconds);
      }
      return n;
    } catch {
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(this.prefix(key), seconds);
    } catch {
      /* Redis unavailable — skip */
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(this.prefix(key));
    } catch {
      return 0;
    }
  }

  get client() {
    return this.redis;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('redisUrl') || 'redis://localhost:6380';
        const client = new Redis(url, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          enableReadyCheck: true,
        });
        client.on('error', (err) => {
          console.error('[Redis] connection error', err.message);
        });
        return client;
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
