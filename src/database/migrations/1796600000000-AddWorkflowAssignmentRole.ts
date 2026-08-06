import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowAssignmentRole1796600000000 implements MigrationInterface {
  name = 'AddWorkflowAssignmentRole1796600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_assignee_rules" ADD COLUMN "assignment_role" varchar(20) NOT NULL DEFAULT 'EXECUTOR'`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_assignee_rules" ADD CONSTRAINT "CHK_workflow_assignee_rules_assignment_role" CHECK ("assignment_role" IN ('EXECUTOR', 'OBSERVER'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_assignee_rules" DROP CONSTRAINT "CHK_workflow_assignee_rules_assignment_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_assignee_rules" DROP COLUMN "assignment_role"`,
    );
  }
}
