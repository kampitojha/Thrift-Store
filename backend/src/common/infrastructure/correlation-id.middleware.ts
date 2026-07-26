import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

export const correlationStorage = new AsyncLocalStorage<Map<string, string>>();

export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.get('correlationId');
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers['x-request-id'] as string) ||
      (req.headers['x-correlation-id'] as string) ||
      randomUUID();

    const store = new Map<string, string>();
    store.set('correlationId', correlationId);

    correlationStorage.run(store, () => {
      req.correlationId = correlationId;
      res.setHeader('x-request-id', correlationId);

      const originalJson = res.json.bind(res);
      res.json = function (body: unknown) {
        if (body && typeof body === 'object' && !('requestId' in (body as Record<string, unknown>))) {
          (body as Record<string, unknown>).requestId = correlationId;
        }
        return originalJson(body);
      };

      next();
    });
  }
}

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
