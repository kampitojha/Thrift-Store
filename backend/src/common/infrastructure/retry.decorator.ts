import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: number;
  includeErrors?: (new (...args: unknown[]) => Error)[];
}

const logger = new Logger('Retryable');

export function Retryable(opts: RetryOptions = {}): MethodDecorator {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelay = opts.delay ?? 200;
  const backoff = opts.backoff ?? 2;
  const includeErrors = opts.includeErrors ?? [Error];

  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          const shouldRetry = includeErrors.some((ErrClass) => lastError instanceof ErrClass);
          if (!shouldRetry || attempt === maxAttempts) {
            throw lastError;
          }

          const delay = baseDelay * Math.pow(backoff, attempt - 1) * (0.5 + Math.random() * 0.5);
          logger.warn(
            `Retry ${propertyKey.toString()} attempt ${attempt}/${maxAttempts} after ${Math.round(delay)}ms: ${lastError.message}`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}
