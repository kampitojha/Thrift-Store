import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

export function createWinstonLogger(): LoggerService {
  const logger = winston.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ms }) => {
            return `${timestamp} [${context || 'App'}] ${level}: ${message} ${ms || ''}`;
          }),
        ),
      }),
    ],
  });

  return {
    log: (message: string, context?: string) => logger.info(message, { context }),
    error: (message: string, trace?: string, context?: string) =>
      logger.error(trace ? `${message}\n${trace}` : message, { context }),
    warn: (message: string, context?: string) => logger.warn(message, { context }),
    debug: (message: string, context?: string) => logger.debug(message, { context }),
    verbose: (message: string, context?: string) => logger.verbose(message, { context }),
  };
}
