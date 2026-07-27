import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeTenantAdminRoleConfigurable1795600000000
  implements MigrationInterface
{
  name = 'MakeTenantAdminRoleConfigurable1795600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles" SET "is_system" = false WHERE "code" = 'admin'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles" SET "is_system" = true WHERE "code" = 'admin'`,
    );
  }
}
