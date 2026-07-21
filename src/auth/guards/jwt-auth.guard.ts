import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import Redis from 'ioredis';
import { firstValueFrom, isObservable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { REDIS } from '../../redis/redis.module';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS) private readonly redis: Redis,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const activation = super.canActivate(context);
    const allowed = isObservable(activation)
      ? await firstValueFrom(activation)
      : await activation;
    if (!allowed) return false;

    const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
    const revoked = await this.redis.get(
      `auth:blacklist:${request.user.tokenId}`,
    );
    return revoked === null;
  }
}
