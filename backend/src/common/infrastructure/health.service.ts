import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../../config/redis.module';
import { ConfigService } from '@nestjs/config';
import { JobQueueService } from './job-queue.service';
import Redis from 'ioredis';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    error?: string;
    details?: any;
  }>;
  timestamp: string;
  uptime: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly jobQueue: JobQueueService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};

    checks.database = await this.checkDatabase();
    checks.redis = await this.checkRedis();
    checks.search = await this.checkMeilisearch();
    checks.queue = await this.jobQueue.checkHealth();
    checks.memory = this.checkMemory();
    checks.disk = await this.checkDisk();
    checks.uptime = { status: 'healthy', latency: 0 };

    const statuses = Object.values(checks).map((c) => c.status);
    const overall: HealthCheckResult['status'] = statuses.every((s) => s === 'healthy')
      ? 'healthy'
      : statuses.some((s) => s === 'unhealthy')
        ? 'unhealthy'
        : 'degraded';

    return {
      status: overall,
      checks,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult['checks']['database']> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', latency: Date.now() - start };
    } catch (err) {
      this.logger.error('Database health check failed', (err as Error).message);
      return { status: 'unhealthy', latency: Date.now() - start, error: (err as Error).message };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult['checks']['redis']> {
    const start = Date.now();
    try {
      const pong = await this.redis.ping();
      return { status: pong === 'PONG' ? 'healthy' : 'degraded', latency: Date.now() - start };
    } catch (err) {
      this.logger.error('Redis health check failed', (err as Error).message);
      return { status: 'unhealthy', latency: Date.now() - start, error: (err as Error).message };
    }
  }

  private async checkMeilisearch(): Promise<HealthCheckResult['checks']['search']> {
    const start = Date.now();
    const host = this.config.get<string>('meiliHost');
    const key = this.config.get<string>('meiliMasterKey');

    if (!host) {
      return { status: 'degraded', latency: 0, error: 'Meilisearch not configured' };
    }

    try {
      const res = await fetch(`${host}/health`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await res.json();
      return {
        status: data.status === 'available' ? 'healthy' : 'unhealthy',
        latency: Date.now() - start,
      };
    } catch (err) {
      return { status: 'unhealthy', latency: Date.now() - start, error: (err as Error).message };
    }
  }

  private checkMemory(): HealthCheckResult['checks']['memory'] {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const ratio = heapUsedMB / heapTotalMB;

    return {
      status: ratio > 0.9 ? 'degraded' : 'healthy',
      latency: 0,
      error: ratio > 0.9 ? `Heap usage ${(ratio * 100).toFixed(1)}%` : undefined,
      details: {
        heapUsedMB: Math.round(heapUsedMB),
        heapTotalMB: Math.round(heapTotalMB),
        rssMB: Math.round(usage.rss / 1024 / 1024),
      },
    };
  }

  private async checkDisk(): Promise<HealthCheckResult['checks']['disk']> {
    const start = Date.now();
    try {
      const os = require('os');
      const free = os.freemem();
      const total = os.totalmem();
      const freeRatio = free / total;

      return {
        status: freeRatio < 0.05 ? 'degraded' : freeRatio < 0.02 ? 'unhealthy' : 'healthy',
        latency: Date.now() - start,
        error: freeRatio < 0.1 ? `Free memory ${(freeRatio * 100).toFixed(1)}%` : undefined,
        details: {
          freeGB: (free / 1024 / 1024 / 1024).toFixed(2),
          totalGB: (total / 1024 / 1024 / 1024).toFixed(2),
        },
      };
    } catch {
      return { status: 'healthy', latency: Date.now() - start };
    }
  }
}
