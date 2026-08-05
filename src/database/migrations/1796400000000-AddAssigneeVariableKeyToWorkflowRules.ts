import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssigneeVariableKeyToWorkflowRules1796400000000 implements MigrationInterface {
  name = 'AddAssigneeVariableKeyToWorkflowRules1796400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "workflow_assignee_rules"
      ADD COLUMN "assignee_variable_key" varchar(80)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "workflow_assignee_rules"
      DROP COLUMN "assignee_variable_key"`);
  }
}
