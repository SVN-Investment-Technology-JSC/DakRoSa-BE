export const TENANT_MODULES = [
  'core',
  'administration',
  'e-office',
  'digital-signature',
  'organization',
  'hrm',
  'attendance',
  'workspace',
  'planning',
  'kpi',
  'project-management',
  'internal-administration',
] as const;

export type TenantModuleKey = (typeof TENANT_MODULES)[number];

export const DEFAULT_TENANT_MODULES: TenantModuleKey[] = [
  'core',
  'administration',
  'e-office',
  'digital-signature',
  'organization',
];

export const TENANT_MODULE_LABELS: Record<TenantModuleKey, string> = {
  core: 'Nền tảng cốt lõi',
  administration: 'Quản trị hệ thống',
  'e-office': 'E-Office',
  'digital-signature': 'Chữ ký số',
  organization: 'Tổ chức & nhân sự nền tảng',
  hrm: 'HRM',
  attendance: 'Chấm công & ca kíp',
  workspace: 'Workspace',
  planning: 'Lập kế hoạch',
  kpi: 'KPI',
  'project-management': 'Quản lý dự án',
  'internal-administration': 'Hành chính nội bộ',
};
