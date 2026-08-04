import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkflowRoleMapping1785814456443 implements MigrationInterface {
    name = 'AddWorkflowRoleMapping1785814456443'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "workflow_role_mappings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "definition_id" uuid NOT NULL, "variable_key" character varying(100) NOT NULL, "mapped_type" character varying(50) NOT NULL, "mapped_value" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9522a2adddb23e4a9e741b99fbe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "sites" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "enabled_modules" SET DEFAULT '["core","administration","e-office","digital-signature","organization"]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "settings" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "organization_units" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "positions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "submission_actions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "signature_requests" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "work_order_logs" ALTER COLUMN "metadata" SET DEFAULT '{}' ::jsonb`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "payload" SET DEFAULT '{}' ::jsonb`);
        await queryRunner.query(`ALTER TABLE "workflow_role_mappings" ADD CONSTRAINT "FK_53e59fd2ca640416051bd7360b2" FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_role_mappings" DROP CONSTRAINT "FK_53e59fd2ca640416051bd7360b2"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "payload" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "work_order_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "signature_requests" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "submission_actions" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "positions" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "organization_units" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "settings" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "enabled_modules" SET DEFAULT '["core", "administration", "e-office", "digital-signature", "organization"]'`);
        await queryRunner.query(`ALTER TABLE "sites" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP TABLE "workflow_role_mappings"`);
    }

}
