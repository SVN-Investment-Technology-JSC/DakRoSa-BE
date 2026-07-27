import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTenantAdminRoles1795700000000 implements MigrationInterface {
  name = 'RenameTenantAdminRoles1795700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "roles"
      SET
        "name" = 'Quản trị doanh nghiệp',
        "description" = 'Vai trò toàn quyền trong phạm vi doanh nghiệp.'
      WHERE "code" = 'admin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "roles"
      SET "name" = 'Quản trị hệ thống'
      WHERE "code" = 'admin'
        AND "name" = 'Quản trị doanh nghiệp'
    `);
  }
}
