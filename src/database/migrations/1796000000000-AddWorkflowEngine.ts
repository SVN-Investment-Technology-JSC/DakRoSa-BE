import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowEngine1796000000000 implements MigrationInterface {
  name = 'AddWorkflowEngine1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── workflow_templates ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "workflow_templates" (
        "id"           uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id"    uuid NOT NULL,
        "key"          varchar(80) NOT NULL,
        "version"      integer NOT NULL DEFAULT 1,
        "name"         varchar(220) NOT NULL,
        "description"  text,
        "status"       varchar(20) NOT NULL DEFAULT 'draft',
        "start_node_id" uuid,
        "created_at"   timestamptz NOT NULL DEFAULT now(),
        "updated_at"   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_templates" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_templates_tenant_id" ON "workflow_templates" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_workflow_templates_tenant_key_version" ON "workflow_templates" ("tenant_id", "key", "version")`,
    );

    // ─── workflow_nodes ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "workflow_nodes" (
        "id"                    uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id"           uuid NOT NULL,
        "step_key"              varchar(80) NOT NULL,
        "name"                  varchar(220) NOT NULL,
        "type"                  varchar(20) NOT NULL DEFAULT 'task',
        "assignee_type"         varchar(40),
        "assignee_value"        varchar(120),
        "assignment_strategy"   varchar(10) NOT NULL DEFAULT 'ANY',
        "sla_minutes"           integer,
        "form_schema"           jsonb,
        "required_permissions"  jsonb NOT NULL DEFAULT '[]',
        "position_x"            float NOT NULL DEFAULT 0,
        "position_y"            float NOT NULL DEFAULT 0,
        "created_at"            timestamptz NOT NULL DEFAULT now(),
        "updated_at"            timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_nodes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workflow_nodes_template"
          FOREIGN KEY ("template_id") REFERENCES "workflow_templates" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_nodes_template_id" ON "workflow_nodes" ("template_id")`,
    );

    // ─── workflow_transitions ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "workflow_transitions" (
        "id"             uuid NOT NULL DEFAULT uuid_generate_v4(),
        "source_node_id" uuid NOT NULL,
        "target_node_id" uuid NOT NULL,
        "condition"      varchar(30) NOT NULL DEFAULT 'DEFAULT',
        "label"          varchar(80),
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_transitions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workflow_transitions_source"
          FOREIGN KEY ("source_node_id") REFERENCES "workflow_nodes" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflow_transitions_target"
          FOREIGN KEY ("target_node_id") REFERENCES "workflow_nodes" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_transitions_source" ON "workflow_transitions" ("source_node_id")`,
    );

    // ─── notifications ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id"   uuid NOT NULL,
        "user_id"     uuid NOT NULL,
        "type"        varchar(40) NOT NULL,
        "title"       varchar(220) NOT NULL,
        "body"        text,
        "action_url"  varchar(500),
        "payload"     jsonb NOT NULL DEFAULT '{}',
        "is_read"     boolean NOT NULL DEFAULT false,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_tenant_user" ON "notifications" ("tenant_id", "user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_is_read" ON "notifications" ("is_read")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_created_at" ON "notifications" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_transitions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_nodes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_templates"`);
  }
}
