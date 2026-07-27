import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeDefaultUserRoleConfigurable1784150000000 implements MigrationInterface {
  name = 'MakeDefaultUserRoleConfigurable1784150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles" SET "is_system" = false WHERE "code" = 'user'`,
    );
    await queryRunner.query(`
      UPDATE "users"
      SET "username" = 'superadmin'
      WHERE "username" = 'admin'
        AND NOT EXISTS (
          SELECT 1 FROM "users" WHERE "username" = 'superadmin'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles" SET "is_system" = true WHERE "code" = 'user'`,
    );
    await queryRunner.query(`
      UPDATE "users"
      SET "username" = 'admin'
      WHERE "username" = 'superadmin'
        AND NOT EXISTS (
          SELECT 1 FROM "users" WHERE "username" = 'admin'
        )
    `);
  }
}
