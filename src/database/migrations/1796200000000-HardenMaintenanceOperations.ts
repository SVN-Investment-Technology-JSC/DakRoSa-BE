import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenMaintenanceOperations1796200000000 implements MigrationInterface {
  name = 'HardenMaintenanceOperations1796200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."workflow_assignee_rules_type_enum" ADD VALUE IF NOT EXISTS 'PREVIOUS_STEP_ACTOR'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."workflow_assignee_rules_type_enum" ADD VALUE IF NOT EXISTS 'MANAGER_OF_REQUESTER'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_work_orders_maintenance_occurrence" ON "work_orders" ("maintenance_occurrence_id") WHERE "maintenance_occurrence_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_work_orders_maintenance_occurrence"`,
    );
  }
}
