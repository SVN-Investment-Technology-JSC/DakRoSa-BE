import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowMultipleWorkflowRoleMappings1796500000000 implements MigrationInterface {
  name = 'AllowMultipleWorkflowRoleMappings1796500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_role_mappings" DROP CONSTRAINT "UQ_workflow_role_mappings_definition_variable"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_role_mappings" ADD CONSTRAINT "UQ_workflow_role_mappings_definition_variable_target" UNIQUE ("definition_id", "variable_key", "target_type", "target_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_role_mappings" DROP CONSTRAINT "UQ_workflow_role_mappings_definition_variable_target"`,
    );
    await queryRunner.query(
      `DELETE FROM "workflow_role_mappings" a USING "workflow_role_mappings" b WHERE a.id > b.id AND a.definition_id = b.definition_id AND a.variable_key = b.variable_key`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_role_mappings" ADD CONSTRAINT "UQ_workflow_role_mappings_definition_variable" UNIQUE ("definition_id", "variable_key")`,
    );
  }
}
