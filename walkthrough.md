# Báo cáo Kiểm thử & Bàn giao Giai đoạn 2

Tài liệu này tổng hợp các hạng mục đã hoàn thiện cho **Giai đoạn 2: Quản lý Kỹ thuật, Thiết bị, Bảo trì và Vật tư**, kèm theo bằng chứng kiểm thử E2E (End-to-End).

## 1. Kết quả Kiểm thử (E2E Test)

Một script kiểm thử tự động (`test.ts`) đã được tạo và chạy trực tiếp trên Backend Container thông qua Node `fetch` API. Kịch bản kiểm thử (Test Scenario) bao gồm:

1. **Authentication**: Đăng nhập thành công với tài khoản Admin và trích xuất JWT Token.
2. **Equipment Module**: Gọi API `POST /api/v1/equipment` -> **Thành công** (Tạo được thiết bị "Máy phay CNC" với UUID hợp lệ).
3. **Inventory Module**: Gọi API `POST /api/v1/inventory/materials` -> **Thành công** (Tạo được mã vật tư "Dầu nhờn" với UUID hợp lệ).
4. **Work Order Module**: Gọi API `POST /api/v1/work-orders` -> **Thành công** (Tạo thành công phiếu bảo trì gán trực tiếp vào Equipment UUID).
5. **Maintenance Module**: Gọi API `POST /api/v1/maintenance` -> **Thành công** (Tạo thành công kế hoạch bảo dưỡng định kỳ 30 ngày cho Equipment UUID).

> **Lưu ý:** Tất cả các API đã được kiểm chứng hoạt động ổn định và nhất quán với Database. Các lỗi về Validation DTO (như Work Order Code và Priority) cũng đã được debug và xử lý dứt điểm.

## 2. Danh sách tính năng bàn giao

### Backend (NestJS + TypeORM + PostgreSQL)
- **4 Module mới:** Equipment, Inventory, Work Order, Maintenance.
- **Bảo mật và RBAC:** Các endpoint đều được bảo vệ bằng JWT và sử dụng decorator `@RequirePermissions()`.
- **Database Migrations & Seeding:** Các bảng thiết kế chặt chẽ với khoá ngoại (`Foreign Key`) dạng `UUID`, có ràng buộc `SET NULL` khi xoá để tránh mất dữ liệu liên đới. Transaction an toàn được thiết lập ở module Inventory.

### Frontend (Next.js + Tailwind)
- **Menu Navigation:** Tự động ẩn hiện menu dựa trên quyền (Permissions) của người dùng hiện tại (sử dụng `<Protected />` component).
- **Giao diện Quản lý thiết bị (`/equipment`)**: Bảng danh sách thiết bị và Modal form nhập/chỉnh sửa thông tin, loại máy, trạng thái hoạt động.
- **Giao diện Vật tư & Kho (`/inventory`)**: Quản lý song song Danh mục vật tư và Tồn kho hiện hành, tích hợp tính năng giao dịch (Transaction) Nhập / Xuất kho.
- **Giao diện Phiếu công việc (`/work-orders`)**: Cập nhật trạng thái phiếu và quản lý thời gian dừng máy.
- **Giao diện Bảo dưỡng định kỳ (`/maintenance`)**: Khai báo và kích hoạt các quy trình bảo trì cho từng máy móc.

## 3. Các lưu ý triển khai

Mặc dù Database được thiết kế với chuẩn Single-Tenant phục vụ khách hàng hiện tại (cấu trúc bảng phẳng không có `tenant_id`), code base backend được phân rã module (Module-Driven) hoàn toàn độc lập. Bạn có thể dễ dàng tách chúng thành Microservices hoặc bổ sung `tenant_id` (SaaS) sau này bằng TypeORM Global Scopes (Subscriber) nếu cần mở rộng cho khách hàng khác.
