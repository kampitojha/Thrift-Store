import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { HealthService } from './health.service';
import { JobQueueService } from './job-queue.service';
import { SecurityMiddleware } from './security.middleware';
import { IdempotencyMiddleware } from './idempotency.middleware';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { LoggingMiddleware } from './logging.middleware';
import { SentryService } from './sentry.service';
import { OpenTelemetryService } from './opentelemetry.service';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';

@Global()
@Module({
  providers: [
    CacheService,
    HealthService,
    JobQueueService,
    SecurityMiddleware,
    IdempotencyMiddleware,
    CorrelationIdMiddleware,
    LoggingMiddleware,
    SentryService,
    OpenTelemetryService,
    AllExceptionsFilter,
  ],
  exports: [
    CacheService,
    HealthService,
    JobQueueService,
    SecurityMiddleware,
    IdempotencyMiddleware,
    CorrelationIdMiddleware,
    LoggingMiddleware,
    SentryService,
    OpenTelemetryService,
    AllExceptionsFilter,
  ],
})
export class InfrastructureModule {}
