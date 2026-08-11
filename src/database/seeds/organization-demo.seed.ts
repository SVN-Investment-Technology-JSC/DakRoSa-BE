import { DataSource, IsNull } from 'typeorm';
import { OrganizationUnitEntity, PersonnelAssignmentEntity, PersonnelEntity, PositionEntity, TenantEntity } from '../entities';
import { DEFAULT_ORGANIZATION_POSITIONS } from '../../tenancy/organization-defaults';

type UnitSeed = { code: string; name: string; type: string; parentCode?: string; sortOrder: number };

// Dữ liệu minh họa bám theo sơ đồ tổ chức Công ty Cổ phần Thủy điện Sông Ba.
const units: UnitSeed[] = [
  { code: 'DHDCD_SBA', name: 'Đại hội đồng Cổ đông', type: 'company', sortOrder: 10 },
  { code: 'HDQT_SBA', name: 'Hội đồng Quản trị', type: 'division', parentCode: 'DHDCD_SBA', sortOrder: 20 },
  { code: 'BKS_SBA', name: 'Ban Kiểm soát', type: 'division', parentCode: 'DHDCD_SBA', sortOrder: 30 },
  { code: 'BTGD_SBA', name: 'Ban Tổng Giám đốc', type: 'division', parentCode: 'HDQT_SBA', sortOrder: 40 },
  { code: 'P_KTD_SBA', name: 'Phòng Kỹ thuật - Đầu tư', type: 'department', parentCode: 'BTGD_SBA', sortOrder: 50 },
  { code: 'NM_SBA', name: 'Nhà máy A', type: 'plant', parentCode: 'BTGD_SBA', sortOrder: 60 },
  { code: 'TT_TVKD_SBA', name: 'Trung tâm Tư vấn và Kinh doanh', type: 'department', parentCode: 'BTGD_SBA', sortOrder: 70 },
  { code: 'P_KHKH_SBA', name: 'Phòng Kế hoạch - Kinh doanh', type: 'department', parentCode: 'BTGD_SBA', sortOrder: 80 },
  { code: 'P_TCHC_SBA', name: 'Phòng Tổ chức - Hành chính', type: 'department', parentCode: 'BTGD_SBA', sortOrder: 90 },
  { code: 'P_TCKT_SBA', name: 'Phòng Tài chính - Kế toán', type: 'department', parentCode: 'BTGD_SBA', sortOrder: 100 },
];

const positions = [
  { code: 'TP_KTD_SBA', name: 'Trưởng phòng Kỹ thuật - Đầu tư', unitCode: 'P_KTD_SBA' },
  { code: 'GD_NM_SBA', name: 'Giám đốc Nhà máy', unitCode: 'NM_SBA' },
  { code: 'GD_TT_TVKD_SBA', name: 'Giám đốc Trung tâm Tư vấn và Kinh doanh', unitCode: 'TT_TVKD_SBA' },
  { code: 'TP_KHKD_SBA', name: 'Trưởng phòng Kế hoạch - Kinh doanh', unitCode: 'P_KHKH_SBA' },
  { code: 'TP_TCHC_SBA', name: 'Trưởng phòng Tổ chức - Hành chính', unitCode: 'P_TCHC_SBA' },
  { code: 'TP_TCKT_SBA', name: 'Trưởng phòng Tài chính - Kế toán', unitCode: 'P_TCKT_SBA' },
  { code: 'KS_KY_THUAT_SBA', name: 'Kỹ sư Kỹ thuật', unitCode: 'P_KTD_SBA' },
  { code: 'CHUYEN_VIEN_DAU_TU_SBA', name: 'Chuyên viên Đầu tư', unitCode: 'P_KTD_SBA' },
  { code: 'CHUYEN_VIEN_QLDA_SBA', name: 'Chuyên viên Quản lý dự án', unitCode: 'P_KTD_SBA' },
  { code: 'NHAN_VIEN_KY_THUAT_SBA', name: 'Nhân viên Kỹ thuật', unitCode: 'P_KTD_SBA' },
];

const personnel = [
  ['SBA001', 'Nguyễn Minh Quân', 'quan.nguyen@example.test'], ['SBA002', 'Trần Ngọc Bích', 'bich.tran@example.test'],
  ['SBA003', 'Lê Hoàng Phúc', 'phuc.le@example.test'], ['SBA004', 'Phạm Thu Hà', 'ha.pham@example.test'],
  ['SBA005', 'Đỗ Đức Thành', 'thanh.do@example.test'], ['SBA006', 'Võ Hoàng Nam', 'nam.vo@example.test'],
  ['SBA007', 'Đặng Thị Mai', 'mai.dang@example.test'], ['SBA008', 'Trần Quốc Dũng', 'dung.tran@example.test'],
  ['SBA009', 'Phan Việt Hùng', 'hung.phan@example.test'], ['SBA010', 'Nguyễn Hải Đăng', 'dang.nguyen@example.test'],
  ['SBA011', 'Bùi Thanh Sơn', 'son.bui@example.test'], ['SBA012', 'Lý Ngọc Anh', 'anh.ly@example.test'],
  ['SBA013', 'Hoàng Thu Trang', 'trang.hoang@example.test'], ['SBA014', 'Đinh Quốc Việt', 'viet.dinh@example.test'],
  ['SBA015', 'Đỗ Anh Tuấn', 'tuan.do@example.test'], ['SBA016', 'Ngô Minh Khoa', 'khoa.ngo@example.test'],
  ['SBA017', 'Nguyễn Quốc Bảo', 'bao.nguyen@example.test'], ['SBA018', 'Trần Minh Đức', 'duc.tran@example.test'],
  ['SBA019', 'Lê Thanh Tùng', 'tung.le@example.test'], ['SBA020', 'Phạm Gia Huy', 'huy.pham@example.test'],
  ['SBA021', 'Võ Khánh Linh', 'linh.vo@example.test'], ['SBA022', 'Đặng Thu Uyên', 'uyen.dang@example.test'],
  ['SBA023', 'Bùi Thành Đạt', 'dat.bui@example.test'], ['SBA024', 'Hoàng Nhật Minh', 'minh.hoang@example.test'],
  ['SBA025', 'Đỗ Phương Anh', 'anh.do@example.test'], ['SBA026', 'Lý Hải Yến', 'yen.ly@example.test'],
  ['SBA027', 'Nguyễn Trọng Nghĩa', 'nghia.nguyen@example.test'], ['SBA028', 'Trần Gia Bảo', 'bao.tran@example.test'],
  ['SBA029', 'Lê Minh Khôi', 'khoi.le@example.test'], ['SBA030', 'Phạm Anh Dũng', 'dung.pham@example.test'],
  ['SBA031', 'Võ Tuấn Kiệt', 'kiet.vo@example.test'], ['SBA032', 'Đặng Quỳnh Như', 'nhu.dang@example.test'],
  ['SBA033', 'Bùi Ngọc Hân', 'han.bui@example.test'], ['SBA034', 'Hoàng Đức Long', 'long.hoang@example.test'],
  ['SBA035', 'Đỗ Minh Châu', 'chau.do@example.test'], ['SBA036', 'Lý Thành Công', 'cong.ly@example.test'],
] as const;

const assignments = [
  ['SBA001', 'HDQT_SBA', 'CHU_TICH_HOI_DONG_QUAN_TRI', 1], ['SBA002', 'HDQT_SBA', 'THANH_VIEN_HOI_DONG_QUAN_TRI', 1],
  ['SBA003', 'BKS_SBA', 'TRUONG_BAN_KIEM_SOAT', 1], ['SBA004', 'BKS_SBA', 'KIEM_SOAT_VIEN', 1],
  ['SBA005', 'BTGD_SBA', 'TONG_GIAM_DOC', 1], ['SBA006', 'BTGD_SBA', 'PHO_TONG_GIAM_DOC_KY_THUAT', 2],
  ['SBA007', 'BTGD_SBA', 'PHO_TONG_GIAM_DOC_KINH_DOANH', 2], ['SBA008', 'BTGD_SBA', 'KE_TOAN_TRUONG', 2],
  ['SBA009', 'P_KTD_SBA', 'TP_KTD_SBA', 4], ['SBA010', 'NM_SBA', 'GD_NM_SBA', 3],
  ['SBA011', 'TT_TVKD_SBA', 'GD_TT_TVKD_SBA', 4], ['SBA012', 'P_KHKH_SBA', 'TP_KHKD_SBA', 4],
  ['SBA013', 'P_TCHC_SBA', 'TP_TCHC_SBA', 4], ['SBA014', 'P_TCKT_SBA', 'TP_TCKT_SBA', 4],
  ['SBA006', 'NM_SBA', 'GIAM_DOC_NHA_MAY', 3, false], ['SBA015', 'NM_SBA', 'VAN_HANH_VIEN', 6], ['SBA016', 'P_KTD_SBA', 'QUAN_TRI_HE_THONG', 6],
  ['SBA017', 'P_KTD_SBA', 'KS_KY_THUAT_SBA', 6], ['SBA018', 'P_KTD_SBA', 'KS_KY_THUAT_SBA', 6],
  ['SBA019', 'P_KTD_SBA', 'KS_KY_THUAT_SBA', 6], ['SBA020', 'P_KTD_SBA', 'KS_KY_THUAT_SBA', 6],
  ['SBA021', 'P_KTD_SBA', 'KS_KY_THUAT_SBA', 6], ['SBA022', 'P_KTD_SBA', 'CHUYEN_VIEN_DAU_TU_SBA', 6],
  ['SBA023', 'P_KTD_SBA', 'CHUYEN_VIEN_DAU_TU_SBA', 6], ['SBA024', 'P_KTD_SBA', 'CHUYEN_VIEN_DAU_TU_SBA', 6],
  ['SBA025', 'P_KTD_SBA', 'CHUYEN_VIEN_DAU_TU_SBA', 6], ['SBA026', 'P_KTD_SBA', 'CHUYEN_VIEN_DAU_TU_SBA', 6],
  ['SBA027', 'P_KTD_SBA', 'CHUYEN_VIEN_QLDA_SBA', 6], ['SBA028', 'P_KTD_SBA', 'CHUYEN_VIEN_QLDA_SBA', 6],
  ['SBA029', 'P_KTD_SBA', 'CHUYEN_VIEN_QLDA_SBA', 6], ['SBA030', 'P_KTD_SBA', 'CHUYEN_VIEN_QLDA_SBA', 6],
  ['SBA031', 'P_KTD_SBA', 'CHUYEN_VIEN_QLDA_SBA', 6], ['SBA032', 'P_KTD_SBA', 'NHAN_VIEN_KY_THUAT_SBA', 6],
  ['SBA033', 'P_KTD_SBA', 'NHAN_VIEN_KY_THUAT_SBA', 6], ['SBA034', 'P_KTD_SBA', 'NHAN_VIEN_KY_THUAT_SBA', 6],
  ['SBA035', 'P_KTD_SBA', 'NHAN_VIEN_KY_THUAT_SBA', 6], ['SBA036', 'P_KTD_SBA', 'NHAN_VIEN_KY_THUAT_SBA', 6],
] as const;

export async function seedOrganizationDemo(dataSource: DataSource, tenant: TenantEntity): Promise<void> {
  const unitRepository = dataSource.getRepository(OrganizationUnitEntity); const positionRepository = dataSource.getRepository(PositionEntity);
  const personnelRepository = dataSource.getRepository(PersonnelEntity); const assignmentRepository = dataSource.getRepository(PersonnelAssignmentEntity);
  const unitByCode = new Map<string, OrganizationUnitEntity>(); const positionByCode = new Map<string, PositionEntity>(); const personByCode = new Map<string, PersonnelEntity>();
  for (const item of DEFAULT_ORGANIZATION_POSITIONS) {
    let record = await positionRepository.findOneBy({ tenantId: tenant.id, code: item.code });
    if (!record) record = positionRepository.create({ tenantId: tenant.id, organizationUnitId: null, ...item, isActive: true, metadata: { systemDefault: true } });
    positionByCode.set(item.code, await positionRepository.save(record));
  }
  for (const item of units) {
    const parent = item.parentCode ? unitByCode.get(item.parentCode) : undefined;
    let record = await unitRepository.findOneBy({ tenantId: tenant.id, code: item.code });
    if (!record) record = unitRepository.create({ tenantId: tenant.id, code: item.code, metadata: { demo: true } });
    Object.assign(record, { name: item.name, type: item.type, parentId: parent?.id ?? null, sortOrder: item.sortOrder, isActive: true }); unitByCode.set(item.code, await unitRepository.save(record));
  }
  for (const item of positions) {
    let record = await positionRepository.findOneBy({ tenantId: tenant.id, code: item.code });
    if (!record) record = positionRepository.create({ tenantId: tenant.id, code: item.code, metadata: { demo: true } });
    Object.assign(record, { name: item.name, organizationUnitId: unitByCode.get(item.unitCode)?.id ?? null, isActive: true }); positionByCode.set(item.code, await positionRepository.save(record));
  }
  for (const [employeeCode, fullName, email] of personnel) {
    let record = await personnelRepository.findOneBy({ tenantId: tenant.id, employeeCode });
    if (!record) record = personnelRepository.create({ tenantId: tenant.id, employeeCode, userId: null });
    Object.assign(record, { fullName, phone: `090${employeeCode.slice(-7)}`, email, status: 'active' }); personByCode.set(employeeCode, await personnelRepository.save(record));
  }
  for (const [employeeCode, unitCode, positionCode, rank, isPrimary = true] of assignments) {
    const person = personByCode.get(employeeCode)!; const unit = unitByCode.get(unitCode)!; const position = positionByCode.get(positionCode)!;
    if (isPrimary) await assignmentRepository.update({ tenantId: tenant.id, personnelId: person.id, isPrimary: true, endDate: IsNull() }, { isPrimary: false });
    let record = await assignmentRepository.findOneBy({ tenantId: tenant.id, personnelId: person.id, organizationUnitId: unit.id, positionId: position.id, endDate: IsNull() });
    if (!record) record = assignmentRepository.create({ tenantId: tenant.id, personnelId: person.id, organizationUnitId: unit.id, positionId: position.id, startDate: new Date().toISOString().slice(0, 10), endDate: null });
    Object.assign(record, { isPrimary, rank }); await assignmentRepository.save(record);
  }
}
