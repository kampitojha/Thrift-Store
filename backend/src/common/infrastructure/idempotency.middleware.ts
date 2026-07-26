import { Injectable, NestMiddleware, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../../config/redis.module';
import Redis from 'ioredis';

const IDEMPOTENCY_TTL = 86400;

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IdempotencyMiddleware.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const key = req.headers['idempotency-key'] as string;
    if (!key) {
      return next();
    }

    if (typeof key !== 'string' || key.length < 8 || key.length > 128) {
      throw new HttpException('Invalid Idempotency-Key format', HttpStatus.BAD_REQUEST);
    }

    const redisKey = `idempotency:${req.method}:${req.originalUrl}:${key}`;
    const existing = await this.redis.get(redisKey);

    if (existing === 'IN_FLIGHT') {
      throw new HttpException(
        'Request with this idempotency key is already in progress',
        HttpStatus.CONFLICT,
      );
    }

    if (existing) {
      try {
        const cached = JSON.parse(existing);
        res.setHeader('Idempotency-Key-Replayed', 'true');
        return res.status(cached.statusCode).json(cached.body);
      } catch {
        await this.redis.del(redisKey);
      }
    }

    await this.redis.set(redisKey, 'IN_FLIGHT', 'EX', IDEMPOTENCY_TTL);

    const originalJson = res.json.bind(res);
    const self = this;
    res.json = function (body: unknown) {
      const statusCode = res.statusCode;
      const payload = JSON.stringify({ statusCode, body });
      self.redis
        .set(redisKey, payload, 'EX', IDEMPOTENCY_TTL)
        .catch((err: Error) => self.logger.error('Idempotency cache set failed', err.message));
      return originalJson(body);
    };

    res.on('close', () => {
      if (res.statusCode >= 500) {
        this.redis.del(redisKey).catch(() => {});
      }
    });

    next();
  }
}
