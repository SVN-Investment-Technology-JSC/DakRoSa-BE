import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message = this.resolveMessage(body, status);

    const logLine = `${request.method} ${request.originalUrl} ${status}`;
    if (status >= 500)
      this.logger.error(
        logLine,
        exception instanceof Error ? exception.stack : undefined,
      );
    else this.logger.warn(logLine);

    response.status(status).json({
      success: false,
      error: {
        code: this.resolveCode(status),
        message,
      },
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }

  private resolveMessage(
    body: string | object | null,
    status: number,
  ): string | string[] {
    if (typeof body === 'string') return body;
    if (body && 'message' in body) {
      const message = body.message;
      if (typeof message === 'string' || Array.isArray(message))
        return message as string | string[];
    }
    return status >= 500
      ? 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
      : 'Yêu cầu không hợp lệ.';
  }

  private resolveCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'TOO_MANY_REQUESTS',
    };
    return (
      codes[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR')
    );
  }
}
