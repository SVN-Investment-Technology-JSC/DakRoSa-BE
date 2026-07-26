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
  TENANT_SETTINGS_VIEW: 'tenant-settings.view',
  TENANT_SETTINGS_UPDATE: 'tenant-settings.update',
  ORGANIZATION_VIEW: 'organization.view',
  ORGANIZATION_MANAGE: 'organization.manage',
  WORK_ITEMS_VIEW: 'work-items.view',
  SUBMISSIONS_VIEW: 'submissions.view',
  SUBMISSIONS_CREATE: 'submissions.create',
  SUBMISSIONS_UPDATE: 'submissions.update',
  SUBMISSIONS_SUBMIT: 'submissions.submit',
  SUBMISSIONS_REVIEW: 'submissions.review',
  SIGNATURES_VIEW: 'signatures.view',
  SIGNATURES_REQUEST: 'signatures.request',
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
  {
    key: PERMISSIONS.TENANT_SETTINGS_VIEW,
    name: 'Xem cấu hình doanh nghiệp',
    group: 'Quản trị doanh nghiệp',
    description:
      'Xem thương hiệu, locale, múi giờ và nhà máy của doanh nghiệp.',
  },
  {
    key: PERMISSIONS.TENANT_SETTINGS_UPDATE,
    name: 'Cập nhật cấu hình doanh nghiệp',
    group: 'Quản trị doanh nghiệp',
    description: 'Cập nhật cấu hình vận hành và nhận diện doanh nghiệp.',
  },
  {
    key: PERMISSIONS.ORGANIZATION_VIEW,
    name: 'Xem cơ cấu tổ chức',
    group: 'Quản trị doanh nghiệp',
    description: 'Xem phòng ban, đơn vị và chức danh.',
  },
  {
    key: PERMISSIONS.ORGANIZATION_MANAGE,
    name: 'Quản lý cơ cấu tổ chức',
    group: 'Quản trị doanh nghiệp',
    description: 'Tạo, cập nhật và ngừng sử dụng đơn vị, chức danh.',
  },
  {
    key: PERMISSIONS.WORK_ITEMS_VIEW,
    name: 'Xem công việc của tôi',
    group: 'Điều hành',
    description: 'Xem các hồ sơ và nhiệm vụ đang chờ xử lý.',
  },
  {
    key: PERMISSIONS.SUBMISSIONS_VIEW,
    name: 'Xem hồ sơ trình ký',
    group: 'E-Office',
    description: 'Xem danh sách và chi tiết hồ sơ trong phạm vi doanh nghiệp.',
  },
  {
    key: PERMISSIONS.SUBMISSIONS_CREATE,
    name: 'Tạo hồ sơ trình ký',
    group: 'E-Office',
    description: 'Tạo hồ sơ trình ký mới.',
  },
  {
    key: PERMISSIONS.SUBMISSIONS_UPDATE,
    name: 'Cập nhật hồ sơ trình ký',
    group: 'E-Office',
    description: 'Cập nhật hồ sơ đang ở trạng thái cho phép chỉnh sửa.',
  },
  {
    key: PERMISSIONS.SUBMISSIONS_SUBMIT,
    name: 'Gửi hồ sơ trình ký',
    group: 'E-Office',
    description: 'Gửi hồ sơ vào luồng phê duyệt.',
  },
  {
    key: PERMISSIONS.SUBMISSIONS_REVIEW,
    name: 'Phê duyệt hồ sơ',
    group: 'E-Office',
    description: 'Phê duyệt hoặc trả lại hồ sơ được phân công.',
  },
  {
    key: PERMISSIONS.SIGNATURES_VIEW,
    name: 'Xem yêu cầu ký số',
    group: 'Chữ ký số',
    description: 'Xem trạng thái các yêu cầu ký số.',
  },
  {
    key: PERMISSIONS.SIGNATURES_REQUEST,
    name: 'Tạo yêu cầu ký số',
    group: 'Chữ ký số',
    description: 'Đưa hồ sơ đã phê duyệt vào hàng đợi ký số.',
  },
];
