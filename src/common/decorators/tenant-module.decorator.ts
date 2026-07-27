import { SetMetadata } from '@nestjs/common';
import { TenantModuleKey } from '../constants/tenant-modules';

export const TENANT_MODULES_KEY = 'requiredTenantModules';

export const RequireTenantModules = (...modules: TenantModuleKey[]) =>
  SetMetadata(TENANT_MODULES_KEY, modules);
