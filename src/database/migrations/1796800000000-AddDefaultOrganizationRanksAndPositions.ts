import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultOrganizationRanksAndPositions1796800000000 implements MigrationInterface {
  name = 'AddDefaultOrganizationRanksAndPositions1796800000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE personnel_assignments ALTER COLUMN rank SET DEFAULT 5');
    await queryRunner.query(`
      INSERT INTO positions (tenant_id, organization_unit_id, code, name, is_active, metadata)
      SELECT tenants.id, NULL, defaults.code, defaults.name, true, '{"systemDefault": true}'::jsonb
      FROM tenants CROSS JOIN (VALUES
        ('GIAM_DOC_CONG_TY', 'Giám đốc (Công ty)'), ('PHO_GIAM_DOC_CONG_TY', 'Phó Giám đốc (Công ty)'),
        ('GIAM_DOC_NHA_MAY', 'Giám đốc Nhà máy'), ('PHO_GIAM_DOC_NHA_MAY', 'Phó Giám đốc Nhà máy'),
        ('QUAN_DOC', 'Quản đốc'), ('TRUONG_BO_PHAN', 'Trưởng Bộ phận'), ('TRUONG_PHONG', 'Trưởng phòng'),
        ('TO_TRUONG', 'Tổ trưởng'), ('TRUONG_CA_VAN_HANH', 'Trưởng ca vận hành'), ('NHOM_TRUONG', 'Nhóm trưởng'),
        ('QUAN_TRI_HE_THONG', 'Quản trị hệ thống'), ('VAN_HANH_VIEN', 'Vận hành viên'),
        ('NHAN_VIEN_SUA_CHUA', 'Nhân viên sửa chữa'), ('NHAN_VIEN', 'Nhân viên')
      ) AS defaults(code, name)
      ON CONFLICT (tenant_id, code) DO NOTHING
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM positions WHERE metadata->>'systemDefault' = 'true'");
    await queryRunner.query('ALTER TABLE personnel_assignments ALTER COLUMN rank SET DEFAULT 3');
  }
}
