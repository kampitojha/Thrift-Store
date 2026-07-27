import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { SentryService } from '../infrastructure/sentry.service';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly sentry: SentryService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId =
      (request.headers['x-request-id'] as string) || randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        message = (obj.message as string | string[]) || message;
        error = (obj.error as string) || exception.name;
        details = obj.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      error,
      details: Array.isArray(message) && message.length > 1 ? message : details,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId,
    };

    // Log to console/winston
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} [${requestId}] → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      
      // Capture 5xx in Sentry
      this.sentry.captureException(exception as Error, {
        requestId,
        path: request.url,
        method: request.method,
        status,
        body: request.body,
        query: request.query,
        user: (request as any).user?.id,
      });
    } else {
      this.logger.warn(
        `${request.method} ${request.url} [${requestId}] → ${status}: ${errorResponse.message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
