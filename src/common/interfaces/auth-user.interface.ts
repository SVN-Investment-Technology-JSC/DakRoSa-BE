export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  sessionId: string;
  tokenId: string;
  tenantId: string;
  tenantSlug: string;
  enabledModules: string[];
  membershipId: string;
  isPlatformAdmin: boolean;
  roleCodes: string[];
  permissions: string[];
}

export interface AuthTenant {
  id: string;
  slug: string;
  code: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  primaryColor: string;
  locale: string;
  timezone: string;
  enabledModules: string[];
  roleCodes: string[];
  permissions: string[];
}

export interface AuthProfile {
  id: string;
  username: string;
  displayName: string;
  isPlatformAdmin: boolean;
  activeTenant: AuthTenant;
  tenants: AuthTenant[];
  roleCodes: string[];
  permissions: string[];
}
