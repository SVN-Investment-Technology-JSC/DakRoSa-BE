# DakRoSa Backend

Backend NestJS cho nền tảng quản trị doanh nghiệp đa tenant. ĐăkRơSa là tenant khởi tạo đầu tiên, không phải giới hạn kiến trúc.

## Phạm vi increment đầu tiên

- Đăng nhập bằng tên đăng nhập/mật khẩu, không có cơ chế bắt buộc đổi mật khẩu.
- Access token ngắn hạn; refresh token xoay vòng trong cookie `HttpOnly`, bản rõ không lưu ở database.
- Logout một phiên, logout toàn bộ phiên và thu hồi access token qua Redis.
- Quản lý người dùng, khóa/mở tài khoản, gán vai trò, đặt lại mật khẩu.
- Vai trò động và permission chuẩn hóa bằng bảng quan hệ.
- Backend là nguồn quyết định quyền; vai trò `admin` được bảo vệ và không xuất hiện trong màn hình gán quyền.
- Audit log không ghi request body, mật khẩu, token, cookie hay Authorization header.
- PostgreSQL migration, Redis, MinIO, OpenAPI và health check.
- Tenant membership, chuyển tenant trong phiên, vai trò tách theo tenant và route frontend `/t/{tenantSlug}`.
- E-Office: hồ sơ nháp, gửi duyệt, phê duyệt/trả lại, lịch sử hành động và việc được phân công.
- Hàng đợi chữ ký số độc lập nhà cung cấp; chưa gọi dịch vụ ký thật khi PoC chưa được chọn.

HRM, chấm công, quản lý dự án, kết nối nhà cung cấp chữ ký số và Collector SCADA nằm ở các increment kế tiếp.

## Giai đoạn 2 (CMMS)

- **Equipment:** Quản lý danh mục thiết bị, máy móc với cấu trúc cây (Parent - Child).
- **Inventory:** Quản lý danh mục vật tư, tồn kho tại nhiều vị trí, theo dõi lịch sử giao dịch (Nhập/Xuất kho). Sử dụng Database Transaction để đảm bảo tính toàn vẹn dữ liệu.
- **Work Orders:** Quản lý sự cố, phiếu công việc, phân công kỹ thuật viên và theo dõi thời gian dừng máy (Downtime).
- **Maintenance:** Thiết lập kế hoạch bảo trì phòng ngừa (Preventive Maintenance) dựa trên chu kỳ thời gian.
- **Bảo mật bổ sung:** Các API mới đều được bảo vệ bằng JWT và sử dụng decorator `@RequirePermissions()` cho từng Action cụ thể.


## Yêu cầu

- Node.js >= 20.9 (đã kiểm thử với Node.js 24.14).
- pnpm 11.7.
- Docker Desktop nếu chạy stack container.

## Chạy development bằng Docker

Hai repo `DakRoSa-BE` và `DakRoSa-FE` phải nằm cạnh nhau như cấu trúc hiện tại.

```powershell
Copy-Item .env.development.example .env.development
docker compose --env-file .env.development -f docker-compose.development.yml up -d --build
```

Các địa chỉ:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8080/api/v1`
- Swagger: `http://localhost:8080/docs`
- MinIO Console: `http://localhost:9001`

Tài khoản seed development lấy từ `ADMIN_USERNAME` và `ADMIN_PASSWORD`. Hãy đổi giá trị mặc định trước khi dùng ngoài máy lập trình. Seed chỉ tạo admin khi chưa tồn tại, không tự ghi đè mật khẩu ở mỗi lần khởi động.

## Chạy backend trực tiếp

```powershell
Copy-Item .env.development.example .env.development
pnpm install
pnpm db:migration:run
pnpm db:seed
pnpm start:dev
```

PostgreSQL, Redis và MinIO vẫn phải đang chạy theo thông số trong `.env.development`.

## Production

1. Sao chép `.env.production.example` thành `.env.production`.
2. Thay toàn bộ giá trị `REPLACE_WITH_*`, tên miền và mật khẩu admin trước lần seed đầu tiên.
3. Đặt certificate tại `docker/certs/server.crt` và private key tại `docker/certs/server.key`.
4. Chạy:

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Production chỉ công bố cổng 80/443 qua Nginx; PostgreSQL, Redis và MinIO ở mạng Docker nội bộ. PostgreSQL 18 dùng volume tại `/var/lib/postgresql` để phù hợp layout nâng cấp major version mới.

Script `docker/certs/generate-dev-cert.ps1.example` chỉ dùng để tạo certificate thử nghiệm. Production nên dùng certificate của CA hoặc PKI nội bộ tin cậy.

## Database và migration

```powershell
pnpm db:migration:show
pnpm db:migration:run
pnpm db:migration:revert
pnpm db:seed
```

`synchronize` luôn tắt ở cả development và production. Mọi thay đổi schema phải đi qua migration.

Các bảng nền tảng: `tenants`, `sites`, `users`, `tenant_memberships`, `roles`, `membership_roles`, `permissions`, `role_permissions`, `auth_sessions`, `audit_logs`.

Các bảng E-Office: `submissions`, `submission_actions`, `signature_requests`.

Migration `1795400000000-AddMultiTenantEOfficeFoundation` tự tạo tenant ĐăkRơSa mặc định và chuyển dữ liệu `user_roles` cũ sang `membership_roles`. Sau migration phải chạy `pnpm db:seed` để đồng bộ permission mới và quyền admin.

Nếu seed cho tenant khác đã tồn tại, đặt `DEFAULT_TENANT_SLUG` trước khi chạy seed.

## Kiểm tra chất lượng

```powershell
pnpm format
pnpm lint
pnpm test --runInBand
pnpm build
```

## Quy ước bảo mật cần giữ

- Không log request body của auth, mật khẩu, JWT, refresh token, cookie hoặc Authorization.
- Không lưu access token ở database; refresh token chỉ lưu SHA-256 hash.
- Mật khẩu băm Argon2id.
- Không thêm permission chỉ ở frontend; endpoint tương ứng phải có `@RequirePermissions`.
- Không dùng `synchronize: true`, kể cả development.
- Không commit `.env`, certificate, private key hoặc credential thật.
