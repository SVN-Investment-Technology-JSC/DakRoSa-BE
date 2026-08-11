import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSongBaOrganizationTitles1797000000000 implements MigrationInterface {
  name = 'AddSongBaOrganizationTitles1797000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO positions (tenant_id, organization_unit_id, code, name, is_active, metadata)
      SELECT tenants.id, NULL, defaults.code, defaults.name, true, '{"systemDefault": true}'::jsonb
      FROM tenants CROSS JOIN (VALUES
        ('TRUONG_BAN_KIEM_SOAT', 'Trưởng Ban Kiểm soát'),
        ('KIEM_SOAT_VIEN', 'Kiểm soát viên'),
        ('PHO_TONG_GIAM_DOC_KY_THUAT', 'Phó Tổng Giám đốc phụ trách Kỹ thuật'),
        ('PHO_TONG_GIAM_DOC_KINH_DOANH', 'Phó Tổng Giám đốc phụ trách Kinh doanh'),
        ('KE_TOAN_TRUONG', 'Kế toán trưởng')
      ) AS defaults(code, name)
      ON CONFLICT (tenant_id, code) DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM positions WHERE code IN ('TRUONG_BAN_KIEM_SOAT','KIEM_SOAT_VIEN','PHO_TONG_GIAM_DOC_KY_THUAT','PHO_TONG_GIAM_DOC_KINH_DOANH','KE_TOAN_TRUONG') AND metadata->>'systemDefault' = 'true'");
  }
}
