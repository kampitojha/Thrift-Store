import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';

export function createWinstonLogger(): LoggerService {
  const isProduction = process.env.NODE_ENV === 'production';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProduction
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ms, stack }) => {
              const msg = stack ? `${message}\n${stack}` : message;
              return `${timestamp} [${context || 'App'}] ${level}: ${msg} ${ms || ''}`;
            }),
          ),
    }),
  ];

  // Add file transport in production for persistence
  if (isProduction) {
    const logDir = process.env.LOG_DIR || '/var/log/thrift-store';
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024,
        maxFiles: 10,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 10,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    );
  }

  const logger = winston.createLogger({ transports, exitOnError: false });

  return {
    log: (message: string, context?: string) => logger.info(message, { context }),
    error: (message: string, trace?: string, context?: string) =>
      logger.error(message, { context, trace, stack: trace }),
    warn: (message: string, context?: string) => logger.warn(message, { context }),
    debug: (message: string, context?: string) => logger.debug(message, { context }),
    verbose: (message: string, context?: string) => logger.verbose(message, { context }),
  };
}
