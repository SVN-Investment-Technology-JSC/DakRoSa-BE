export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_RESET_PASSWORD: 'users.reset-password',
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_ASSIGN_PERMISSIONS: 'roles.assign-permissions',
  AUDIT_VIEW: 'audit.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_CATALOG: ReadonlyArray<{
  key: PermissionKey;
  name: string;
  group: string;
  description: string;
}> = [
  {
    key: PERMISSIONS.DASHBOARD_VIEW,
    name: 'Xem tổng quan',
    group: 'Tổng quan',
    description: 'Truy cập bảng điều khiển vận hành.',
  },
  {
    key: PERMISSIONS.USERS_VIEW,
    name: 'Xem người dùng',
    group: 'Người dùng',
    description: 'Xem danh sách và chi tiết người dùng.',
  },
  {
    key: PERMISSIONS.USERS_CREATE,
    name: 'Tạo người dùng',
    group: 'Người dùng',
    description: 'Tạo tài khoản mới.',
  },
  {
    key: PERMISSIONS.USERS_UPDATE,
    name: 'Cập nhật người dùng',
    group: 'Người dùng',
    description: 'Cập nhật thông tin, trạng thái và vai trò.',
  },
  {
    key: PERMISSIONS.USERS_DELETE,
    name: 'Xóa người dùng',
    group: 'Người dùng',
    description: 'Xóa tài khoản không còn sử dụng.',
  },
  {
    key: PERMISSIONS.USERS_RESET_PASSWORD,
    name: 'Đặt lại mật khẩu',
    group: 'Người dùng',
    description: 'Đặt mật khẩu mới theo yêu cầu quản trị.',
  },
  {
    key: PERMISSIONS.ROLES_VIEW,
    name: 'Xem vai trò',
    group: 'Vai trò & quyền',
    description: 'Xem vai trò và ma trận quyền.',
  },
  {
    key: PERMISSIONS.ROLES_CREATE,
    name: 'Tạo vai trò',
    group: 'Vai trò & quyền',
    description: 'Tạo vai trò động.',
  },
  {
    key: PERMISSIONS.ROLES_UPDATE,
    name: 'Cập nhật vai trò',
    group: 'Vai trò & quyền',
    description: 'Cập nhật tên và mô tả vai trò.',
  },
  {
    key: PERMISSIONS.ROLES_DELETE,
    name: 'Xóa vai trò',
    group: 'Vai trò & quyền',
    description: 'Xóa vai trò không phải hệ thống.',
  },
  {
    key: PERMISSIONS.ROLES_ASSIGN_PERMISSIONS,
    name: 'Gán quyền',
    group: 'Vai trò & quyền',
    description: 'Thay đổi quyền của vai trò.',
  },
  {
    key: PERMISSIONS.AUDIT_VIEW,
    name: 'Xem nhật ký',
    group: 'Nhật ký',
    description: 'Theo dõi các thay đổi quản trị.',
  },
];
