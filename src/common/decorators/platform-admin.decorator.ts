import { SetMetadata } from '@nestjs/common';

export const PLATFORM_ADMIN_KEY = 'platformAdminOnly';
export const PlatformAdminOnly = () => SetMetadata(PLATFORM_ADMIN_KEY, true);
