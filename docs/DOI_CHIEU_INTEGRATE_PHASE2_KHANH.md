# Đối chiếu tích hợp `feat/phase2-be-Khanh`

## Phạm vi và nguyên tắc

- Nhánh nguồn: `origin/feat/phase2-be-Khanh` (`5e87f18`).
- Nhánh tích hợp: `integrate/phase2-khanh-workflow`, tạo từ `dev/release` (`d89adb1`).
- Không cherry-pick nguyên hai commit workflow cũ. Các commit này thay thế toàn bộ engine và dùng schema khác với `dev/release`.
- Chỉ port từng năng lực nghiệp vụ còn thiếu, dùng entity, DTO, service, migration và API hiện tại làm nền tảng.

## Đối chiếu theo file

| File nhánh Khanh | Chức năng | Tình trạng trên `dev/release` | Quyết định tích hợp |
|---|---|---|---|
| `src/app.module.ts` | Đăng ký workflow và notification module cũ | Đã có `WorkflowModule` và `NotificationsModule` mới | Không port |
| `src/common/constants/permissions.ts` | Quyền workflow create/update/delete/execute/review | Đã có quyền definition/manage/publish và work-order execute/review | Chuẩn hóa/mapping khi cần, không thêm bộ quyền trùng |
| `src/database/entities/index.ts` | Export entity workflow cũ | Đã export đầy đủ entity workflow mới | Chỉ bổ sung export cho entity mới nếu Phase 1 tạo ra |
| `notification.entity.ts` | `payload`, `isRead`, loại thông báo cố định | Schema mới có resource, dedupe key, `readAt` | Không port schema; có thể port danh mục loại thông báo vào hằng số riêng |
| `work-order-log.entity.ts` | Thêm metadata cho log | Schema mới đã có workflow action và work-order update riêng | Không port, chỉ đánh giá lại khi có nhu cầu audit cụ thể |
| `workflow-definition.entity.ts` | Definition cũ với version relation | Definition/version mới hỗ trợ tenant, archive, publish, creator | Không port |
| `workflow-version.entity.ts` | Version cũ có nodes/transitions cascade | Version mới có draft/published/retired và graph load riêng | Không port |
| `workflow-node.entity.ts` | `assignees` JSON, cấu hình node | Node mới có `config`; phân công chuẩn hóa ở `workflow_assignee_rules` | Port dữ liệu cấu hình hợp lệ vào `config`, không port cột `assignees` |
| `workflow-transition.entity.ts` | Liên kết qua source/target key | Schema mới dùng source/target node id, action key và condition JSON | Không port |
| `workflow-template.entity.ts` | Template model thế hệ đầu | Đã bị thay bởi definition/version | Không port |
| `workflow-role-mapping.entity.ts` | Master Board: biến quy trình → role/user/đơn vị/chức danh | Chưa có tương đương trên `dev/release` | **Port ở Phase 1**, thiết kế lại theo schema mới |
| `1785812038993-UpdateWorkflowDefinition.ts` | Chuyển engine cũ sang definition/version | Chạy trước migration tạo bảng cần thay đổi, không chạy được từ DB trống | Không dùng |
| `1785814456443-AddWorkflowRoleMapping.ts` | Tạo role mapping cũ | Phụ thuộc schema cũ | Thay bằng migration mới, timestamp lớn hơn migration hiện hành |
| `1796000000000-AddWorkflowEngine.ts` | Tạo template/node/transition/notification schema cũ | Trùng timestamp và xung đột schema với migration CMMS hiện tại | Không dùng |
| `src/notification/*` | API/service notification cũ | Đã có notification module hiện hành | Không port |
| `workflow/dto/workflow.dto.ts` | DTO definition/draft/role mapping/master board/execute | DTO workflow mới đã tồn tại | Chỉ port DTO Master Board, đổi tên và validate theo chuẩn mới |
| `workflow/workflow-engine.service.ts` | CRUD, publish, execute, master board, resolve mapping | `WorkflowService` mới đã có CRUD/version/instance/action/assignee/SLA | Chỉ port logic Master Board và resolve mapping |
| `workflow/workflow.controller.ts` | API workflow cũ và Master Board | Controller mới có API definition/instance/action | Chỉ thêm API Master Board tương thích vào controller mới |
| `workflow/workflow.module.ts` | Repository/provider cho engine cũ | Module mới đã có repository workflow chuẩn | Chỉ thêm entity/service Master Board nếu Phase 1 được duyệt |

## Đối chiếu chức năng

| Chức năng nhánh Khanh | `dev/release` hiện có | Kết luận |
|---|---|---|
| Tạo, sửa, clone, publish, archive workflow | Có, đầy đủ hơn | Không port |
| Version workflow | Có | Không port |
| Graph node/transition | Có, hỗ trợ nhánh điều kiện/song song | Không port |
| Giao user/role/chức danh/đơn vị/người tạo/người xử lý trước | Có qua `WorkflowAssigneeRuleEntity` | Không port |
| ANY/ALL/QUORUM | Có qua `strategy` và `quorum` | Không port |
| SLA | Có qua `node.config.slaMinutes` và task due date | Không port |
| Quyền xử lý bước | Có qua `node.config.requiredPermissions` | Không port |
| Biểu mẫu khi xử lý | Có qua `node.config.formFields` và action payload | Không port |
| Notification giao việc/SLA | Có nền tảng notification mới | Chỉ bổ sung type/template nếu cần |
| Master Board: ánh xạ biến → người/role/đơn vị/chức danh | Chưa có | **Port Phase 1** |
| Resolve nhiều biến trong một lượt | Chưa có API chung | **Port cùng Phase 1** |

## Thiết kế đề xuất cho Phase 1: Master Board

1. Tạo entity `WorkflowRoleMappingEntity` mới, tham chiếu `workflow_definitions`.
2. Mỗi mapping gồm `variableKey`, `targetType` (`USER`, `ROLE`, `POSITION`, `ORGANIZATION_UNIT`) và `targetId`.
3. Không dùng trường text tự do `mappedValue`; dùng UUID và kiểm tra tenant để tránh mapping chéo doanh nghiệp.
4. Thêm migration mới theo schema hiện tại, không sửa migration lịch sử.
5. Thêm các API:
   - `GET /workflow/definitions/:id/master-board`
   - `PUT /workflow/definitions/:id/master-board`
   - `POST /workflow/role-mappings/resolve`
6. Tích hợp mapping vào node có cấu hình `assigneeVariableKey`; không thay đổi hành vi các rule hiện hữu.
7. Bổ sung test service: tenant isolation, duplicate variable key, resolve nhiều biến, target bị xóa/không thuộc tenant.

## Lộ trình port đề xuất

| Phase | Phạm vi | Điều kiện hoàn thành |
|---|---|---|
| 1 | Entity, migration, DTO, service và API Master Board | Build/lint/test pass; API mapping chạy trên schema mới |
| 2 | Gắn `assigneeVariableKey` vào workflow assignee rule | Mapping thực sự ảnh hưởng phân công task; workflow cũ không đổi |
| 3 | UI Master Board và lựa chọn user/role/đơn vị/chức danh | FE/BE contract hoàn chỉnh, kiểm thử luồng người dùng |
| 4 | Notification type/template còn thiếu từ nhánh Khanh | Không thay đổi schema notification hiện hữu nếu không cần thiết |

## Rủi ro cần tránh

- Không chạy migration của nhánh Khanh trên database đang dùng bởi `dev/release`.
- Không dùng lại các bảng/cột cũ: `workflow_nodes.assignees`, `notifications.payload`, `notifications.is_read`.
- Không cherry-pick nguyên `WorkflowEngineService` hoặc controller/module cũ.
- Không force-push đè nhánh của thành viên Khanh.
