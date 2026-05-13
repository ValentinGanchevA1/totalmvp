import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log the error with appropriate level
    // 4xx errors are client errors (expected behavior), log at WARN level
    // 5xx errors are server errors, log at ERROR level
    const logMessage = `${request.method} ${request.url} - Status: ${status}`;
    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : exception,
      );
    } else if (status >= 400) {
      this.logger.warn(logMessage);
    } else {
      this.logger.debug(logMessage);
    }

    // Send to Sentry for non-4xx errors, with sensitive fields scrubbed
    if (status >= 500 && exception instanceof Error) {
      const SENSITIVE_BODY_KEYS = new Set(['password', 'passwordHash', 'token', 'refreshToken', 'secret']);
      const SENSITIVE_HEADER_KEYS = new Set(['authorization', 'cookie', 'x-api-key']);

      const scrubBody = (body: Record<string, unknown>) =>
        Object.fromEntries(
          Object.entries(body ?? {}).map(([k, v]) =>
            SENSITIVE_BODY_KEYS.has(k.toLowerCase()) ? [k, '[REDACTED]'] : [k, v],
          ),
        );

      const scrubHeaders = (headers: Record<string, unknown>) =>
        Object.fromEntries(
          Object.entries(headers ?? {}).map(([k, v]) =>
            SENSITIVE_HEADER_KEYS.has(k.toLowerCase()) ? [k, '[REDACTED]'] : [k, v],
          ),
        );

      Sentry.captureException(exception, {
        tags: {
          method: request.method,
          url: request.url,
          status: status.toString(),
        },
        extra: {
          body: scrubBody(request.body),
          query: request.query,
          params: request.params,
          headers: scrubHeaders(request.headers as Record<string, unknown>),
        },
      });
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || 'Internal server error',
    });
  }
}
