import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeniorOrganizationDefaults1796900000000 implements MigrationInterface {
  name = 'AddSeniorOrganizationDefaults1796900000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('UPDATE personnel_assignments SET rank = rank + 1 WHERE rank BETWEEN 1 AND 5');
    await queryRunner.query('ALTER TABLE personnel_assignments ALTER COLUMN rank SET DEFAULT 6');
    await queryRunner.query(`
      INSERT INTO positions (tenant_id, organization_unit_id, code, name, is_active, metadata)
      SELECT tenants.id, NULL, defaults.code, defaults.name, true, '{"systemDefault": true}'::jsonb
      FROM tenants CROSS JOIN (VALUES
        ('CHU_TICH_HOI_DONG_QUAN_TRI', 'Chủ tịch Hội đồng quản trị'),
        ('THANH_VIEN_HOI_DONG_QUAN_TRI', 'Thành viên Hội đồng quản trị'),
        ('TONG_GIAM_DOC', 'Tổng Giám đốc'), ('PHO_TONG_GIAM_DOC', 'Phó Tổng Giám đốc'),
        ('GIAM_DOC_KHOI', 'Giám đốc Khối')
      ) AS defaults(code, name)
      ON CONFLICT (tenant_id, code) DO NOTHING
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM positions WHERE code IN ('CHU_TICH_HOI_DONG_QUAN_TRI','THANH_VIEN_HOI_DONG_QUAN_TRI','TONG_GIAM_DOC','PHO_TONG_GIAM_DOC','GIAM_DOC_KHOI') AND metadata->>'systemDefault' = 'true'");
    await queryRunner.query('UPDATE personnel_assignments SET rank = rank - 1 WHERE rank BETWEEN 2 AND 6');
    await queryRunner.query('ALTER TABLE personnel_assignments ALTER COLUMN rank SET DEFAULT 5');
  }
}
