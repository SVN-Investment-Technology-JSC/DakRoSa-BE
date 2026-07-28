import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWarehouseToWorkOrderMaterial1785205903785 implements MigrationInterface {
  name = 'AddWarehouseToWorkOrderMaterial1785205903785';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_order_materials" ADD "warehouse_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sites" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ALTER COLUMN "enabled_modules" SET DEFAULT '["core","administration","e-office","digital-signature","organization"]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ALTER COLUMN "settings" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_units" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_materials" ADD CONSTRAINT "FK_e5e806f40b82cd528a68e6d07f5" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_order_materials" DROP CONSTRAINT "FK_e5e806f40b82cd528a68e6d07f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_units" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ALTER COLUMN "settings" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ALTER COLUMN "enabled_modules" SET DEFAULT '["core", "administration", "e-office", "digital-signature", "organization"]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sites" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_materials" DROP COLUMN "warehouse_id"`,
    );
  }
}
