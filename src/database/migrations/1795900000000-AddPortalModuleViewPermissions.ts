import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPortalModuleViewPermissions1795900000000 implements MigrationInterface {
  name = 'AddPortalModuleViewPermissions1795900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "name", "group", "description")
      VALUES
        ('operations.view', 'Xem vận hành', 'Vận hành', 'Truy cập các màn hình vận hành nhà máy được cấp quyền.'),
        ('eoffice.view', 'Xem eOffice', 'eOffice', 'Truy cập không gian eOffice và các phân hệ được cấp quyền.')
      ON CONFLICT ("key") DO UPDATE
      SET
        "name" = EXCLUDED."name",
        "group" = EXCLUDED."group",
        "description" = EXCLUDED."description"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "key" IN ('operations.view', 'eoffice.view')
    `);
  }
}
