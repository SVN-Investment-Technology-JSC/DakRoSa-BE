import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_MODULES_KEY } from '../../common/decorators/tenant-module.decorator';
import { TenantModuleKey } from '../../common/constants/tenant-modules';
import { AuthUser } from '../../common/interfaces/auth-user.interface';

@Injectable()
export class TenantModuleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const modules = this.reflector.getAllAndOverride<TenantModuleKey[]>(
      TENANT_MODULES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!modules?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (request.user?.isPlatformAdmin) return true;
    const enabledModules = request.user?.enabledModules ?? [];
    if (modules.every((module) => enabledModules.includes(module))) return true;

    throw new ForbiddenException(
      'Phân hệ này chưa được kích hoạt cho doanh nghiệp hiện tại.',
    );
  }
}
