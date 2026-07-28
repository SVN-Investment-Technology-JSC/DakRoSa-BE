import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAttachmentsToWorkOrder1785203140901 implements MigrationInterface {
    name = 'AddAttachmentsToWorkOrder1785203140901'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work_orders" ADD "attachments" jsonb`);
        await queryRunner.query(`ALTER TABLE "sites" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "enabled_modules" SET DEFAULT '["core","administration","e-office","digital-signature","organization"]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "settings" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "organization_units" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "positions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "submission_actions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "signature_requests" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "signature_requests" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "submission_actions" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "positions" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "organization_units" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "settings" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "enabled_modules" SET DEFAULT '["core", "administration", "e-office", "digital-signature", "organization"]'`);
        await queryRunner.query(`ALTER TABLE "sites" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "attachments"`);
    }

}
