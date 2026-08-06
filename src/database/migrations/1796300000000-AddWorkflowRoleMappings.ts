import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowRoleMappings1796300000000 implements MigrationInterface {
  name = 'AddWorkflowRoleMappings1796300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "workflow_role_mappings" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "definition_id" uuid NOT NULL,
      "variable_key" varchar(80) NOT NULL,
      "target_type" varchar(40) NOT NULL,
      "target_id" uuid NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_workflow_role_mappings" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_workflow_role_mappings_definition_variable" UNIQUE ("definition_id", "variable_key"),
      CONSTRAINT "CHK_workflow_role_mappings_target_type"
        CHECK ("target_type" IN ('USER', 'ROLE', 'POSITION', 'ORGANIZATION_UNIT')),
      CONSTRAINT "FK_workflow_role_mappings_definition"
        FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_role_mappings_definition" ON "workflow_role_mappings" ("definition_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "workflow_role_mappings"`);
  }
}
