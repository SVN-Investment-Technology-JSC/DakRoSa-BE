import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLATFORM_ADMIN_KEY } from '../../common/decorators/platform-admin.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      PLATFORM_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (user?.isPlatformAdmin) return true;
    throw new ForbiddenException(
      'Chỉ quản trị viên nền tảng mới được thực hiện thao tác này.',
    );
  }
}
