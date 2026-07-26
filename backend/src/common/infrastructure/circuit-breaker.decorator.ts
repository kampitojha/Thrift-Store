import { Logger } from '@nestjs/common';

const logger = new Logger('CircuitBreaker');

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuitStates = new Map<string, CircuitState>();
const HALF_OPEN_MAX = 1;

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThreshold?: number;
  resetTimeout?: number;
  name?: string;
}

export class CircuitBreakerOpenException extends Error {
  constructor(name: string) {
    super(`Circuit breaker '${name}' is open`);
    this.name = 'CircuitBreakerOpenException';
  }
}

export function CircuitBreaker(opts: CircuitBreakerOptions = {}): MethodDecorator {
  const timeout = opts.timeout ?? 10000;
  const errorThreshold = opts.errorThreshold ?? 5;
  const resetTimeout = opts.resetTimeout ?? 30000;
  const name = opts.name ?? 'unknown';

  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;
    const circuitKey = `${target.constructor?.name || 'unknown'}.${String(propertyKey)}`;

    descriptor.value = async function (...args: unknown[]) {
      let state = circuitStates.get(circuitKey);
      if (!state) {
        state = { failures: 0, lastFailureTime: 0, state: 'closed' };
        circuitStates.set(circuitKey, state);
      }

      if (state.state === 'open') {
        if (Date.now() - state.lastFailureTime >= resetTimeout) {
          state.state = 'half-open';
          logger.warn(`Circuit ${circuitKey} → half-open`);
        } else {
          throw new CircuitBreakerOpenException(name);
        }
      }

      let timeoutHandle: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Circuit breaker '${name}' timed out after ${timeout}ms`));
        }, timeout);
      });

      try {
        const result = await Promise.race([
          originalMethod.apply(this, args),
          timeoutPromise,
        ]);

        clearTimeout(timeoutHandle!);

        if (state.state === 'half-open') {
          state.state = 'closed';
          state.failures = 0;
          logger.log(`Circuit ${circuitKey} → closed (recovered)`);
        }

        state.failures = 0;
        return result;
      } catch (err) {
        clearTimeout(timeoutHandle!);
        state.failures++;
        state.lastFailureTime = Date.now();

        if (state.failures >= errorThreshold) {
          state.state = 'open';
          logger.error(`Circuit ${circuitKey} → open (${state.failures} failures)`);
        }

        throw err;
      }
    };

    return descriptor;
  };
}

export function resetCircuitBreaker(key: string): void {
  circuitStates.delete(key);
}

export function getCircuitStates(): Map<string, CircuitState> {
  return new Map(circuitStates);
}
