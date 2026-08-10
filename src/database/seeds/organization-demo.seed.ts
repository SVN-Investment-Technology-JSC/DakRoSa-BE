import { DataSource, IsNull } from 'typeorm';
import {
  OrganizationUnitEntity,
  PersonnelAssignmentEntity,
  PersonnelEntity,
  PositionEntity,
  TenantEntity,
} from '../entities';

type UnitSeed = { code: string; name: string; type: string; parentCode?: string; sortOrder: number };

const units: UnitSeed[] = [
  { code: 'TCT_MAU', name: 'CÔNG TY MẸ (DỮ LIỆU MẪU)', type: 'company', sortOrder: 100 },
  { code: 'KHOI_VH_MAU', name: 'Khối Vận hành', type: 'division', parentCode: 'TCT_MAU', sortOrder: 110 },
  { code: 'NM_A_MAU', name: 'Nhà máy Thủy điện A', type: 'plant', parentCode: 'KHOI_VH_MAU', sortOrder: 120 },
  { code: 'P_KTVH_MAU', name: 'Phòng Kỹ thuật vận hành', type: 'department', parentCode: 'NM_A_MAU', sortOrder: 130 },
  { code: 'TO_TB_MAU', name: 'Tổ Thiết bị', type: 'team', parentCode: 'P_KTVH_MAU', sortOrder: 140 },
  { code: 'P_TCHC_MAU', name: 'Phòng Tổ chức - Hành chính', type: 'department', parentCode: 'TCT_MAU', sortOrder: 150 },
];

const positions = [
  { code: 'TGD_MAU', name: 'Tổng Giám đốc', unitCode: undefined },
  { code: 'PGD_KT_MAU', name: 'Phó Tổng Giám đốc Kỹ thuật', unitCode: undefined },
  { code: 'GD_NM_MAU', name: 'Giám đốc Nhà máy', unitCode: 'NM_A_MAU' },
  { code: 'TP_KTVH_MAU', name: 'Trưởng phòng Kỹ thuật vận hành', unitCode: 'P_KTVH_MAU' },
  { code: 'NV_KTVH_MAU', name: 'Nhân viên Kỹ thuật vận hành', unitCode: 'P_KTVH_MAU' },
  { code: 'TP_TCHC_MAU', name: 'Trưởng phòng Tổ chức - Hành chính', unitCode: 'P_TCHC_MAU' },
];

const personnel = [
  { employeeCode: 'EMP001', fullName: 'Nguyễn Văn An', phone: '0901000001', email: 'an.nguyen@example.test' },
  { employeeCode: 'EMP002', fullName: 'Trần Thị Bình', phone: '0901000002', email: 'binh.tran@example.test' },
  { employeeCode: 'EMP003', fullName: 'Lê Quốc Cường', phone: '0901000003', email: 'cuong.le@example.test' },
  { employeeCode: 'EMP004', fullName: 'Phạm Minh Đức', phone: '0901000004', email: 'duc.pham@example.test' },
  { employeeCode: 'EMP005', fullName: 'Võ Thu Hà', phone: '0901000005', email: 'ha.vo@example.test' },
  { employeeCode: 'EMP006', fullName: 'Nguyễn Thu Lan', phone: '0901000006', email: 'lan.nguyen@example.test' },
];

const assignments = [
  { employeeCode: 'EMP001', unitCode: 'TCT_MAU', positionCode: 'TGD_MAU', isPrimary: true, rank: 1 },
  { employeeCode: 'EMP002', unitCode: 'TCT_MAU', positionCode: 'PGD_KT_MAU', isPrimary: true, rank: 2 },
  { employeeCode: 'EMP002', unitCode: 'NM_A_MAU', positionCode: 'GD_NM_MAU', isPrimary: false, rank: 1 },
  { employeeCode: 'EMP003', unitCode: 'NM_A_MAU', positionCode: 'GD_NM_MAU', isPrimary: true, rank: 1 },
  { employeeCode: 'EMP004', unitCode: 'P_KTVH_MAU', positionCode: 'TP_KTVH_MAU', isPrimary: true, rank: 1 },
  { employeeCode: 'EMP005', unitCode: 'P_KTVH_MAU', positionCode: 'NV_KTVH_MAU', isPrimary: true, rank: 3 },
  { employeeCode: 'EMP005', unitCode: 'TO_TB_MAU', positionCode: 'NV_KTVH_MAU', isPrimary: false, rank: 3 },
  { employeeCode: 'EMP006', unitCode: 'P_TCHC_MAU', positionCode: 'TP_TCHC_MAU', isPrimary: true, rank: 1 },
];

export async function seedOrganizationDemo(dataSource: DataSource, tenant: TenantEntity): Promise<void> {
  const unitRepository = dataSource.getRepository(OrganizationUnitEntity);
  const positionRepository = dataSource.getRepository(PositionEntity);
  const personnelRepository = dataSource.getRepository(PersonnelEntity);
  const assignmentRepository = dataSource.getRepository(PersonnelAssignmentEntity);
  const unitByCode = new Map<string, OrganizationUnitEntity>();
  const positionByCode = new Map<string, PositionEntity>();
  const personByCode = new Map<string, PersonnelEntity>();

  for (const item of units) {
    const parent = item.parentCode ? unitByCode.get(item.parentCode) : undefined;
    let record = await unitRepository.findOneBy({ tenantId: tenant.id, code: item.code });
    if (!record) record = unitRepository.create({ tenantId: tenant.id, code: item.code, metadata: { demo: true } });
    Object.assign(record, { name: item.name, type: item.type, parentId: parent?.id ?? null, sortOrder: item.sortOrder, isActive: true });
    unitByCode.set(item.code, await unitRepository.save(record));
  }

  for (const item of positions) {
    let record = await positionRepository.findOneBy({ tenantId: tenant.id, code: item.code });
    if (!record) record = positionRepository.create({ tenantId: tenant.id, code: item.code, metadata: { demo: true } });
    Object.assign(record, { name: item.name, organizationUnitId: item.unitCode ? unitByCode.get(item.unitCode)?.id ?? null : null, isActive: true });
    positionByCode.set(item.code, await positionRepository.save(record));
  }

  for (const item of personnel) {
    let record = await personnelRepository.findOneBy({ tenantId: tenant.id, employeeCode: item.employeeCode });
    if (!record) record = personnelRepository.create({ tenantId: tenant.id, employeeCode: item.employeeCode, userId: null });
    Object.assign(record, { fullName: item.fullName, phone: item.phone, email: item.email, status: 'active' });
    personByCode.set(item.employeeCode, await personnelRepository.save(record));
  }

  for (const item of assignments) {
    const person = personByCode.get(item.employeeCode)!;
    const unit = unitByCode.get(item.unitCode)!;
    const position = positionByCode.get(item.positionCode)!;
    if (item.isPrimary) await assignmentRepository.update({ tenantId: tenant.id, personnelId: person.id, isPrimary: true, endDate: IsNull() }, { isPrimary: false });
    let record = await assignmentRepository.findOneBy({ tenantId: tenant.id, personnelId: person.id, organizationUnitId: unit.id, positionId: position.id, endDate: IsNull() });
    if (!record) record = assignmentRepository.create({ tenantId: tenant.id, personnelId: person.id, organizationUnitId: unit.id, positionId: position.id, startDate: new Date().toISOString().slice(0, 10), endDate: null });
    Object.assign(record, { isPrimary: item.isPrimary, rank: item.rank });
    await assignmentRepository.save(record);
  }
}
