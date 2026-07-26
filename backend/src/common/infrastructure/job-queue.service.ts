import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../../config/redis.module';
import Redis from 'ioredis';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
type JobPriority = 1 | 2 | 3 | 4 | 5;

interface JobPayload {
  type: string;
  data: Record<string, unknown>;
  priority?: JobPriority;
  scheduledAt?: Date;
  deduplicationKey?: string;
  maxAttempts?: number;
}

interface JobHandler {
  (job: { id: string; type: string; data: Record<string, unknown>; attempt: number }): Promise<void>;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
}

@Injectable()
export class JobQueueService {
  private readonly logger = new Logger(JobQueueService.name);
  private handlers = new Map<string, JobHandler>();
  private activeTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async enqueue(type: string, data: Record<string, unknown>, opts?: {
    priority?: JobPriority;
    scheduledAt?: Date;
    deduplicationKey?: string;
    maxAttempts?: number;
  }): Promise<string> {
    if (opts?.deduplicationKey) {
      const existing = await this.prisma.platformJob.findFirst({
        where: {
          type,
          status: { in: ['pending', 'processing'] },
          payload: { path: ['deduplicationKey'], equals: opts.deduplicationKey },
        },
      });
      if (existing) {
        this.logger.debug(`Deduplicated job ${type} with key ${opts.deduplicationKey}`);
        return existing.id;
      }
    }

    const job = await this.prisma.platformJob.create({
      data: {
        type,
        status: 'pending',
        priority: opts?.priority ?? 3,
        scheduledAt: opts?.scheduledAt ?? new Date(),
        maxAttempts: opts?.maxAttempts ?? 3,
        attempts: 0,
        payload: {
          data: data as Record<string, string>,
          deduplicationKey: opts?.deduplicationKey,
        } as any,
      },
    });

    await this.redis.lpush('queue:jobs', job.id);
    this.logger.debug(`Enqueued job ${job.id} of type ${type}`);
    return job.id;
  }

  registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  async processQueue(type: string, handler: JobHandler, opts?: {
    concurrency?: number;
    pollIntervalMs?: number;
  }): Promise<void> {
    this.registerHandler(type, handler);
    const interval = opts?.pollIntervalMs ?? 1000;
    const concurrency = opts?.concurrency ?? 5;

    const poll = async () => {
      for (let i = 0; i < concurrency; i++) {
        const jobId = await this.redis.rpop('queue:jobs');
        if (!jobId) break;

        this.processJob(jobId, type).catch((err) => {
          this.logger.error(`Failed to process job ${jobId}: ${err.message}`);
        });
      }
    };

    await poll();
    const timer = setInterval(poll, interval);
    this.activeTimers.set(type, timer);
  }

  async stopQueue(type: string): Promise<void> {
    const timer = this.activeTimers.get(type);
    if (timer) {
      clearInterval(timer);
      this.activeTimers.delete(type);
    }
  }

  async retryJob(jobId: string): Promise<void> {
    const job = await this.prisma.platformJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.attempts >= job.maxAttempts) {
      throw new Error(`Job ${jobId} has exceeded max attempts`);
    }

    await this.prisma.platformJob.update({
      where: { id: jobId },
      data: { status: 'pending', attempts: { increment: 1 } },
    });

    await this.redis.lpush('queue:jobs', jobId);
  }

  async getQueueStats(): Promise<QueueStats> {
    const counts = await this.prisma.platformJob.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const stats: QueueStats = { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };
    for (const group of counts) {
      const key = group.status as JobStatus;
      if (key in stats) {
        stats[key] = group._count.id;
      }
    }
    return stats;
  }

  private async processJob(jobId: string, type: string): Promise<void> {
    const job = await this.prisma.platformJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'pending' || job.type !== type) return;

    if (job.scheduledAt && job.scheduledAt > new Date()) {
      await this.redis.lpush('queue:jobs', jobId);
      return;
    }

    const handler = this.handlers.get(type);
    if (!handler) {
      this.logger.warn(`No handler registered for job type: ${type}`);
      return;
    }

    await this.prisma.platformJob.update({
      where: { id: jobId },
      data: { status: 'processing', startedAt: new Date() },
    });

    try {
      const data = (job.payload as any)?.data || {};
      await handler({ id: jobId, type, data, attempt: job.attempts + 1 });

      await this.prisma.platformJob.update({
        where: { id: jobId },
        data: { status: 'completed', completedAt: new Date() },
      });
    } catch (error) {
      const attempt = job.attempts + 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const lastError = { attempt, message: errorMessage, timestamp: new Date().toISOString() };
      const errors = [...((job.metadata as any)?.errors || []), lastError];

      if (attempt >= job.maxAttempts) {
        await this.prisma.platformJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            metadata: { ...(job.metadata as any), errors },
            completedAt: new Date(),
            errorMessage,
          },
        });
        this.logger.error(`Job ${jobId} failed permanently after ${attempt} attempts: ${errorMessage}`);
      } else {
        await this.prisma.platformJob.update({
          where: { id: jobId },
          data: {
            status: 'pending',
            attempts: attempt,
            metadata: { ...(job.metadata as any), errors },
            errorMessage,
          },
        });
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        setTimeout(() => {
          this.redis.lpush('queue:jobs', jobId).catch(() => {});
        }, delay);
      }
    }
  }
}
