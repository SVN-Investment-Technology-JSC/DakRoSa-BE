import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface ClientContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export const ClientContextParam = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ClientContext => {
    const request = context.switchToHttp().getRequest<Request>();
    return {
      ipAddress: request.ip || null,
      userAgent: request.get('user-agent') || null,
    };
  },
);
