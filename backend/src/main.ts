// BigInt serialisation — Prisma returns BigInt for paise fields
(BigInt.prototype as unknown as Record<string, unknown>).toJSON = function () {
  return Number(this);
};

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { createWinstonLogger } from './common/logger/winston.logger';
import { CorrelationIdMiddleware } from './common/infrastructure/correlation-id.middleware';
import { LoggingMiddleware } from './common/infrastructure/logging.middleware';
import { SecurityMiddleware } from './common/infrastructure/security.middleware';
import { IdempotencyMiddleware } from './common/infrastructure/idempotency.middleware';

// CJS interop helpers (Nest/CommonJS builds)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const helmetMw = (helmet as any).default || helmet;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compressionMw = (compression as any).default || compression;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cookieParserMw = (cookieParser as any).default || cookieParser;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const logger = createWinstonLogger();
  app.useLogger(logger);

  const port = config.get<number>('PORT', 4000);
  const apiPrefix = config.get<string>('API_PREFIX', 'api/v1');
  const corsOrigins = config
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.setGlobalPrefix(apiPrefix.replace(/\/v1$/, ''), {
    exclude: ['health', 'health/(.*)'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const correlationMw = app.get(CorrelationIdMiddleware);
  const loggingMw = app.get(LoggingMiddleware);
  const securityMw = app.get(SecurityMiddleware);
  const idempotencyMw = app.get(IdempotencyMiddleware);

  app.use(correlationMw.use.bind(correlationMw));
  app.use(loggingMw.use.bind(loggingMw));
  app.use(securityMw.use.bind(securityMw));
  app.use(idempotencyMw.use.bind(idempotencyMw));
  app.use(helmetMw({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compressionMw());
  app.use(cookieParserMw());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Device-Id', 'Idempotency-Key'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      validateCustomDecorators: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Reloom API')
      .setDescription('Premium thrift marketplace — production API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  logger.log(`Reloom API running on http://localhost:${port}/${apiPrefix}`, 'Bootstrap');
  logger.log(`Swagger docs: http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap();
