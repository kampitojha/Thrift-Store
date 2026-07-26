import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private initialized = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const dsn = this.config.get<string>('SENTRY_DSN');
    if (!dsn) {
      this.logger.warn('SENTRY_DSN not configured — Sentry disabled');
      return;
    }

    Sentry.init({
      dsn,
      environment: this.config.get('NODE_ENV', 'development'),
      tracesSampleRate: this.config.get('NODE_ENV') === 'production' ? 0.2 : 0.0,
      profilesSampleRate: this.config.get('NODE_ENV') === 'production' ? 0.1 : 0.0,
      integrations: [
        Sentry.httpIntegration(),
        Sentry.nativeNodeFetchIntegration(),
      ],
      maxBreadcrumbs: 50,
      attachStacktrace: true,
    });

    this.initialized = true;
    this.logger.log('Sentry initialized');
  }

  captureException(error: Error, context?: Record<string, unknown>) {
    if (!this.initialized) return;
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context);
      }
      Sentry.captureException(error);
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    if (!this.initialized) return;
    Sentry.captureMessage(message, level);
  }

  setUser(user: { id: string; email?: string; username?: string } | null) {
    if (!this.initialized) return;
    if (user) {
      Sentry.setUser({ id: user.id, email: user.email, username: user.username });
    } else {
      Sentry.setUser(null);
    }
  }
}
