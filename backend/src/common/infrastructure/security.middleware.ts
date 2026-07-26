import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../../config/redis.module';
import Redis from 'ioredis';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (req.path.startsWith('/api')) {
      this.setCspHeaders(res);
      this.setOtherSecurityHeaders(res);
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      const deviceId = req.headers['x-device-id'] as string;
      if (deviceId) {
        (req as any).deviceId = deviceId;
      }
    }

    next();
  }

  private setCspHeaders(res: Response) {
    const csp = [
      "default-src 'self'",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https: http: ws: wss:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "font-src 'self' data: https:",
      "frame-src 'self' https:",
      "media-src 'self' https:",
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);
  }

  private setOtherSecurityHeaders(res: Response) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}
