import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlexibleMaintenancePlatform1796100000000 implements MigrationInterface {
  name = 'AddFlexibleMaintenancePlatform1796100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."work_orders_status_enum" ADD VALUE IF NOT EXISTS 'CANCELLED'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."workflow_nodes_type_enum" AS ENUM ('START','HUMAN_TASK','SERVICE_TASK','CONDITION','PARALLEL_SPLIT','PARALLEL_JOIN','END')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."workflow_assignee_rules_type_enum" AS ENUM ('USER','ORGANIZATION_UNIT','POSITION','ROLE','REQUEST_FIELD','CREATOR')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."maintenance_job_plan_steps_type_enum" AS ENUM ('INSTRUCTION','CHECKLIST','MEASUREMENT','EVIDENCE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."maintenance_schedule_targets_target_type_enum" AS ENUM ('EQUIPMENT','EQUIPMENT_GROUP')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."maintenance_triggers_type_enum" AS ENUM ('TIME_RRULE','METER_THRESHOLD','DOMAIN_EVENT','CONDITION')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."work_order_updates_type_enum" AS ENUM ('PROGRESS','BLOCKER','SUPPORT_REQUEST','RESULT','COMMENT')`,
    );

    await queryRunner.query(`CREATE TABLE "workflow_definitions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tenant_id" uuid NOT NULL,
      "key" varchar(80) NOT NULL,
      "name" varchar(180) NOT NULL,
      "description" text,
      "resource_type" varchar(80) NOT NULL DEFAULT 'maintenance_work_order',
      "status" varchar(30) NOT NULL DEFAULT 'draft',
      "current_version_id" uuid,
      "created_by" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_workflow_definitions" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_workflow_definitions_tenant_key" UNIQUE ("tenant_id","key"),
      CONSTRAINT "FK_workflow_definitions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_workflow_definitions_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_definitions_tenant" ON "workflow_definitions" ("tenant_id")`,
    );

    await queryRunner.query(`CREATE TABLE "workflow_versions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "definition_id" uuid NOT NULL,
      "version_number" integer NOT NULL,
      "status" varchar(30) NOT NULL DEFAULT 'draft',
      "schema_version" integer NOT NULL DEFAULT 1,
      "changelog" text,
      "created_by" uuid,
      "published_by" uuid,
      "published_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_workflow_versions" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_workflow_versions_definition_number" UNIQUE ("definition_id","version_number"),
      CONSTRAINT "FK_workflow_versions_definition" FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_workflow_versions_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_workflow_versions_publisher" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_versions_definition" ON "workflow_versions" ("definition_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_definitions" ADD CONSTRAINT "FK_workflow_definitions_current_version" FOREIGN KEY ("current_version_id") REFERENCES "workflow_versions"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(`CREATE TABLE "workflow_nodes" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "version_id" uuid NOT NULL,
      "key" varchar(80) NOT NULL,
      "type" "public"."workflow_nodes_type_enum" NOT NULL,
      "name" varchar(180) NOT NULL,
      "description" text,
      "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "ui_position" jsonb NOT NULL DEFAULT '{}'::jsonb,
      CONSTRAINT "PK_workflow_nodes" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_workflow_nodes_version_key" UNIQUE ("version_id","key"),
      CONSTRAINT "FK_workflow_nodes_version" FOREIGN KEY ("version_id") REFERENCES "workflow_versions"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_nodes_version" ON "workflow_nodes" ("version_id")`,
    );

    await queryRunner.query(`CREATE TABLE "workflow_transitions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "version_id" uuid NOT NULL,
      "source_node_id" uuid NOT NULL,
      "target_node_id" uuid NOT NULL,
      "action_key" varchar(80) NOT NULL,
      "label" varchar(120) NOT NULL,
      "condition" jsonb,
      "sort_order" integer NOT NULL DEFAULT 0,
      CONSTRAINT "PK_workflow_transitions" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_workflow_transitions_version_action_source" UNIQUE ("version_id","source_node_id","action_key"),
      CONSTRAINT "FK_workflow_transitions_version" FOREIGN KEY ("version_id") REFERENCES "workflow_versions"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_workflow_transitions_source" FOREIGN KEY ("source_node_id") REFERENCES "workflow_nodes"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_workflow_transitions_target" FOREIGN KEY ("target_node_id") REFERENCES "workflow_nodes"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_transitions_version" ON "workflow_transitions" ("version_id")`,
    );

    await queryRunner.query(`CREATE TABLE "workflow_assignee_rules" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "node_id" uuid NOT NULL,
      "type" "public"."workflow_assignee_rules_type_enum" NOT NULL,
      "subject_id" uuid,
      "field_key" varchar(120),
      "strategy" varchar(20) NOT NULL DEFAULT 'ANY',
      "quorum" integer,
      "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
      CONSTRAINT "PK_workflow_assignee_rules" PRIMARY KEY ("id"),
      CONSTRAINT "FK_workflow_assignee_rules_node" FOREIGN KEY ("node_id") REFERENCES "workflow_nodes"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_assignee_rules_node" ON "workflow_assignee_rules" ("node_id")`,
    );

    await queryRunner.query(`CREATE TABLE "workflow_instances" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tenant_id" uuid NOT NULL,
      "definition_id" uuid NOT NULL,
      "version_id" uuid NOT NULL,
      "resource_type" varchar(80) NOT NULL,
      "resource_id" uuid NOT NULL,
      "current_node_id" uuid,
      "status" varchar(30) NOT NULL DEFAULT 'running',
      "context" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "started_at" timestamptz NOT NULL DEFAULT now(),
      "completed_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_workflow_instances" PRIMARY KEY ("id"),
      CONSTRAINT "FK_workflow_instances_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_workflow_instances_definition" FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_workflow_instances_version" FOREIGN KEY ("version_id") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_workflow_instances_current_node" FOREIGN KEY ("current_node_id") REFERENCES "workflow_nodes"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_instances_tenant" ON "workflow_instances" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_instances_resource" ON "workflow_instances" ("tenant_id","resource_type","resource_id")`,
    );

    await queryRunner.query(`CREATE TABLE "workflow_tokens" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "instance_id" uuid NOT NULL,
      "node_id" uuid NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'active',
      "branch_key" varchar(120),
      "consumed_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_workflow_tokens" PRIMARY KEY ("id"),
      CONSTRAINT "FK_workflow_tokens_instance" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_workflow_tokens_node" FOREIGN KEY ("node_id") REFERENCES "workflow_nodes"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_tokens_active" ON "workflow_tokens" ("instance_id","status","node_id")`,
    );

    await queryRunner.query(`CREATE TABLE "workflow_tasks" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "instance_id" uuid NOT NULL,
      "node_id" uuid NOT NULL,
      "name" varchar(180) NOT NULL,
      "status" varchar(30) NOT NULL DEFAULT 'pending',
      "claimed_by" uuid,
      "due_at" timestamptz,
      "activated_at" timestamptz NOT NULL DEFAULT now(),
      "completed_at" timestamptz,
      "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_workflow_tasks" PRIMARY KEY ("id"),
      CONSTRAINT "FK_workflow_tasks_instance" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_workflow_tasks_node" FOREIGN KEY ("node_id") REFERENCES "workflow_nodes"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_workflow_tasks_claimant" FOREIGN KEY ("claimed_by") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_tasks_instance" ON "workflow_tasks" ("instance_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_tasks_status_due" ON "workflow_tasks" ("status","due_at")`,
    );

    await queryRunner.query(`CREATE TABLE "workflow_task_assignments" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "task_id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
      "type" varchar(30) NOT NULL DEFAULT 'candidate',
      "acted_at" timestamptz,
      CONSTRAINT "PK_workflow_task_assignments" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_workflow_task_assignments_task_user" UNIQUE ("task_id","user_id"),
      CONSTRAINT "FK_workflow_task_assignments_task" FOREIGN KEY ("task_id") REFERENCES "workflow_tasks"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_workflow_task_assignments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_task_assignments_user" ON "workflow_task_assignments" ("user_id")`,
    );

    await queryRunner.query(`CREATE TABLE "workflow_actions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tenant_id" uuid NOT NULL,
      "instance_id" uuid NOT NULL,
      "task_id" uuid,
      "actor_id" uuid,
      "action_key" varchar(80) NOT NULL,
      "from_node_id" uuid,
      "to_node_id" uuid,
      "note" text,
      "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "idempotency_key" varchar(120),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_workflow_actions" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_workflow_actions_tenant_idempotency" UNIQUE ("tenant_id","idempotency_key"),
      CONSTRAINT "FK_workflow_actions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_workflow_actions_instance" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_workflow_actions_task" FOREIGN KEY ("task_id") REFERENCES "workflow_tasks"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_workflow_actions_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_workflow_actions_from_node" FOREIGN KEY ("from_node_id") REFERENCES "workflow_nodes"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_workflow_actions_to_node" FOREIGN KEY ("to_node_id") REFERENCES "workflow_nodes"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_actions_instance" ON "workflow_actions" ("instance_id","created_at")`,
    );

    await queryRunner.query(`CREATE TABLE "maintenance_job_plans" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tenant_id" uuid NOT NULL,
      "code" varchar(80) NOT NULL,
      "name" varchar(180) NOT NULL,
      "description" text,
      "category" varchar(80),
      "status" varchar(30) NOT NULL DEFAULT 'draft',
      "current_version_id" uuid,
      "created_by" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_maintenance_job_plans" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_maintenance_job_plans_tenant_code" UNIQUE ("tenant_id","code"),
      CONSTRAINT "FK_maintenance_job_plans_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_maintenance_job_plans_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_job_plans_tenant" ON "maintenance_job_plans" ("tenant_id")`,
    );

    await queryRunner.query(`CREATE TABLE "maintenance_job_plan_versions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "job_plan_id" uuid NOT NULL,
      "version_number" integer NOT NULL,
      "status" varchar(30) NOT NULL DEFAULT 'draft',
      "estimated_minutes" integer,
      "required_skills" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "custom_fields" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "published_by" uuid,
      "published_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_maintenance_job_plan_versions" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_maintenance_job_plan_versions_plan_number" UNIQUE ("job_plan_id","version_number"),
      CONSTRAINT "FK_maintenance_job_plan_versions_plan" FOREIGN KEY ("job_plan_id") REFERENCES "maintenance_job_plans"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_maintenance_job_plan_versions_publisher" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_job_plan_versions_plan" ON "maintenance_job_plan_versions" ("job_plan_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_job_plans" ADD CONSTRAINT "FK_maintenance_job_plans_current_version" FOREIGN KEY ("current_version_id") REFERENCES "maintenance_job_plan_versions"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(`CREATE TABLE "maintenance_job_plan_steps" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "version_id" uuid NOT NULL,
      "key" varchar(80) NOT NULL,
      "sort_order" integer NOT NULL,
      "type" "public"."maintenance_job_plan_steps_type_enum" NOT NULL,
      "title" varchar(180) NOT NULL,
      "description" text,
      "is_required" boolean NOT NULL DEFAULT true,
      "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
      CONSTRAINT "PK_maintenance_job_plan_steps" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_maintenance_job_plan_steps_version_key" UNIQUE ("version_id","key"),
      CONSTRAINT "FK_maintenance_job_plan_steps_version" FOREIGN KEY ("version_id") REFERENCES "maintenance_job_plan_versions"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "equipment_groups" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tenant_id" uuid NOT NULL,
      "code" varchar(80) NOT NULL,
      "name" varchar(180) NOT NULL,
      "description" text,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_equipment_groups" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_equipment_groups_tenant_code" UNIQUE ("tenant_id","code"),
      CONSTRAINT "FK_equipment_groups_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE TABLE "equipment_group_members" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "group_id" uuid NOT NULL,
      "equipment_id" uuid NOT NULL,
      CONSTRAINT "PK_equipment_group_members" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_equipment_group_members_group_equipment" UNIQUE ("group_id","equipment_id"),
      CONSTRAINT "FK_equipment_group_members_group" FOREIGN KEY ("group_id") REFERENCES "equipment_groups"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_equipment_group_members_equipment" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "maintenance_schedules" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tenant_id" uuid NOT NULL,
      "site_id" uuid,
      "code" varchar(80) NOT NULL,
      "name" varchar(180) NOT NULL,
      "description" text,
      "job_plan_id" uuid NOT NULL,
      "workflow_definition_id" uuid NOT NULL,
      "default_assignee_id" uuid,
      "default_technical_reviewer_id" uuid,
      "status" varchar(30) NOT NULL DEFAULT 'draft',
      "timezone" varchar(60) NOT NULL,
      "start_date" date NOT NULL,
      "end_date" date,
      "reminder_minutes" jsonb NOT NULL DEFAULT '[1440]'::jsonb,
      "created_by" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_maintenance_schedules" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_maintenance_schedules_tenant_code" UNIQUE ("tenant_id","code"),
      CONSTRAINT "FK_maintenance_schedules_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_maintenance_schedules_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_maintenance_schedules_job_plan" FOREIGN KEY ("job_plan_id") REFERENCES "maintenance_job_plans"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_maintenance_schedules_workflow" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_maintenance_schedules_assignee" FOREIGN KEY ("default_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_maintenance_schedules_reviewer" FOREIGN KEY ("default_technical_reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_maintenance_schedules_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_schedules_tenant_site" ON "maintenance_schedules" ("tenant_id","site_id")`,
    );

    await queryRunner.query(`CREATE TABLE "maintenance_schedule_targets" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "schedule_id" uuid NOT NULL,
      "target_type" "public"."maintenance_schedule_targets_target_type_enum" NOT NULL,
      "target_id" uuid NOT NULL,
      CONSTRAINT "PK_maintenance_schedule_targets" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_maintenance_schedule_targets_schedule_target" UNIQUE ("schedule_id","target_type","target_id"),
      CONSTRAINT "FK_maintenance_schedule_targets_schedule" FOREIGN KEY ("schedule_id") REFERENCES "maintenance_schedules"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "maintenance_triggers" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "schedule_id" uuid NOT NULL,
      "type" "public"."maintenance_triggers_type_enum" NOT NULL,
      "config" jsonb NOT NULL,
      "next_due_at" timestamptz,
      "last_fired_at" timestamptz,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_maintenance_triggers" PRIMARY KEY ("id"),
      CONSTRAINT "FK_maintenance_triggers_schedule" FOREIGN KEY ("schedule_id") REFERENCES "maintenance_schedules"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_triggers_due" ON "maintenance_triggers" ("is_active","next_due_at")`,
    );

    await queryRunner.query(`CREATE TABLE "maintenance_occurrences" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tenant_id" uuid NOT NULL,
      "schedule_id" uuid NOT NULL,
      "trigger_id" uuid NOT NULL,
      "equipment_id" uuid,
      "planned_start_at" timestamptz NOT NULL,
      "due_at" timestamptz,
      "status" varchar(30) NOT NULL DEFAULT 'planned',
      "dedupe_key" varchar(180) NOT NULL,
      "work_order_id" uuid,
      "snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_maintenance_occurrences" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_maintenance_occurrences_tenant_dedupe" UNIQUE ("tenant_id","dedupe_key"),
      CONSTRAINT "FK_maintenance_occurrences_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_maintenance_occurrences_schedule" FOREIGN KEY ("schedule_id") REFERENCES "maintenance_schedules"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_maintenance_occurrences_trigger" FOREIGN KEY ("trigger_id") REFERENCES "maintenance_triggers"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_maintenance_occurrences_equipment" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_occurrences_calendar" ON "maintenance_occurrences" ("tenant_id","planned_start_at","status")`,
    );

    await queryRunner.query(`CREATE TABLE "equipment_meters" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tenant_id" uuid NOT NULL,
      "equipment_id" uuid NOT NULL,
      "code" varchar(80) NOT NULL,
      "name" varchar(180) NOT NULL,
      "unit" varchar(40) NOT NULL,
      "rollover_value" double precision,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_equipment_meters" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_equipment_meters_equipment_code" UNIQUE ("equipment_id","code"),
      CONSTRAINT "FK_equipment_meters_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_equipment_meters_equipment" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE TABLE "equipment_meter_readings" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tenant_id" uuid NOT NULL,
      "meter_id" uuid NOT NULL,
      "value" double precision NOT NULL,
      "occurred_at" timestamptz NOT NULL,
      "source" varchar(30) NOT NULL DEFAULT 'manual',
      "external_id" varchar(180),
      "created_by" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_equipment_meter_readings" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_equipment_meter_readings_tenant_external" UNIQUE ("tenant_id","external_id"),
      CONSTRAINT "FK_equipment_meter_readings_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_equipment_meter_readings_meter" FOREIGN KEY ("meter_id") REFERENCES "equipment_meters"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_equipment_meter_readings_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_equipment_meter_readings_meter_time" ON "equipment_meter_readings" ("meter_id","occurred_at")`,
    );

    await queryRunner.query(`CREATE TABLE "notifications" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tenant_id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
      "type" varchar(80) NOT NULL,
      "title" varchar(180) NOT NULL,
      "body" text NOT NULL,
      "resource_type" varchar(80),
      "resource_id" uuid,
      "action_url" varchar(500),
      "dedupe_key" varchar(180),
      "read_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_notifications_tenant_user_dedupe" UNIQUE ("tenant_id","user_id","dedupe_key"),
      CONSTRAINT "FK_notifications_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_inbox" ON "notifications" ("tenant_id","user_id","read_at","created_at")`,
    );

    await queryRunner.query(`ALTER TABLE "equipments"
      ADD COLUMN "site_id" uuid,
      ADD CONSTRAINT "FK_equipments_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL`);
    await queryRunner.query(
      `CREATE INDEX "IDX_equipments_tenant_site" ON "equipments" ("tenant_id","site_id")`,
    );

    await queryRunner.query(`ALTER TABLE "work_orders"
      ADD COLUMN "site_id" uuid,
      ADD COLUMN "planned_start_at" timestamptz,
      ADD COLUMN "due_at" timestamptz,
      ADD COLUMN "progress_percent" integer NOT NULL DEFAULT 0,
      ADD COLUMN "maintenance_schedule_id" uuid,
      ADD COLUMN "maintenance_occurrence_id" uuid,
      ADD COLUMN "job_plan_version_id" uuid,
      ADD COLUMN "workflow_instance_id" uuid,
      ADD COLUMN "custom_fields" jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD CONSTRAINT "FK_work_orders_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL,
      ADD CONSTRAINT "FK_work_orders_schedule" FOREIGN KEY ("maintenance_schedule_id") REFERENCES "maintenance_schedules"("id") ON DELETE SET NULL,
      ADD CONSTRAINT "FK_work_orders_occurrence" FOREIGN KEY ("maintenance_occurrence_id") REFERENCES "maintenance_occurrences"("id") ON DELETE SET NULL,
      ADD CONSTRAINT "FK_work_orders_job_plan_version" FOREIGN KEY ("job_plan_version_id") REFERENCES "maintenance_job_plan_versions"("id") ON DELETE SET NULL,
      ADD CONSTRAINT "FK_work_orders_workflow_instance" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE SET NULL`);
    await queryRunner.query(
      `ALTER TABLE "maintenance_occurrences" ADD CONSTRAINT "FK_maintenance_occurrences_work_order" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(`CREATE TABLE "work_order_updates" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tenant_id" uuid NOT NULL,
      "work_order_id" uuid NOT NULL,
      "actor_id" uuid NOT NULL,
      "type" "public"."work_order_updates_type_enum" NOT NULL,
      "progress_percent" integer,
      "note" text NOT NULL,
      "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_work_order_updates" PRIMARY KEY ("id"),
      CONSTRAINT "FK_work_order_updates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_work_order_updates_order" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_work_order_updates_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_work_order_updates_order_time" ON "work_order_updates" ("tenant_id","work_order_id","created_at")`,
    );

    await queryRunner.query(`CREATE TABLE "work_order_checklist_results" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "work_order_id" uuid NOT NULL,
      "step_id" uuid NOT NULL,
      "status" varchar(30) NOT NULL DEFAULT 'pending',
      "value" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "note" text,
      "completed_by" uuid,
      "completed_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_work_order_checklist_results" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_work_order_checklist_results_order_step" UNIQUE ("work_order_id","step_id"),
      CONSTRAINT "FK_work_order_checklist_results_order" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_work_order_checklist_results_step" FOREIGN KEY ("step_id") REFERENCES "maintenance_job_plan_steps"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_work_order_checklist_results_user" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL
    )`);

    await this.seedDefaultWorkflows(queryRunner);
    await this.backfillLegacyCmms(queryRunner);
  }

  private async seedDefaultWorkflows(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO "workflow_definitions"
      ("tenant_id","key","name","description","resource_type","status")
      SELECT t.id, 'maintenance-standard', 'Quy trình bảo trì tiêu chuẩn',
        'Mẫu có thể tùy chỉnh: giao việc, thi công, kiểm tra kỹ thuật và hoàn tất.',
        'maintenance_work_order', 'published'
      FROM "tenants" t
      ON CONFLICT ("tenant_id","key") DO NOTHING`);

    await queryRunner.query(`INSERT INTO "workflow_versions"
      ("definition_id","version_number","status","schema_version","changelog","published_at")
      SELECT d.id, 1, 'published', 1, 'Khởi tạo từ migration CMMS linh hoạt.', now()
      FROM "workflow_definitions" d
      WHERE d.key = 'maintenance-standard'
        AND NOT EXISTS (
          SELECT 1 FROM "workflow_versions" v
          WHERE v.definition_id = d.id AND v.version_number = 1
        )`);

    await queryRunner.query(`UPDATE "workflow_definitions" d
      SET current_version_id = v.id, updated_at = now()
      FROM "workflow_versions" v
      WHERE v.definition_id = d.id AND v.version_number = 1
        AND d.key = 'maintenance-standard'`);

    await queryRunner.query(`INSERT INTO "workflow_nodes"
      ("version_id","key","type","name","description","config","ui_position")
      SELECT v.id, node.key, node.type::"public"."workflow_nodes_type_enum",
        node.name, node.description, node.config, node.position
      FROM "workflow_versions" v
      JOIN "workflow_definitions" d ON d.id = v.definition_id
      CROSS JOIN (VALUES
        ('start','START','Khởi tạo','Tạo hồ sơ bảo trì','{}'::jsonb,'{"x":80,"y":180}'::jsonb),
        ('execute','HUMAN_TASK','Tiếp nhận & thi công','Cập nhật tiến độ, khó khăn và kết quả','{"slaMinutes":2880}'::jsonb,'{"x":340,"y":180}'::jsonb),
        ('technical_review','HUMAN_TASK','Kiểm tra kỹ thuật','Xác nhận hoặc yêu cầu thực hiện lại','{"slaMinutes":1440}'::jsonb,'{"x":620,"y":180}'::jsonb),
        ('completed','END','Hoàn tất','Lưu hồ sơ và đóng công việc','{}'::jsonb,'{"x":900,"y":180}'::jsonb)
      ) AS node(key,type,name,description,config,position)
      WHERE d.key = 'maintenance-standard' AND v.version_number = 1
      ON CONFLICT ("version_id","key") DO NOTHING`);

    await queryRunner.query(`INSERT INTO "workflow_transitions"
      ("version_id","source_node_id","target_node_id","action_key","label","sort_order")
      SELECT v.id, source.id, target.id, edge.action_key, edge.label, edge.sort_order
      FROM "workflow_versions" v
      JOIN "workflow_definitions" d ON d.id = v.definition_id
      CROSS JOIN (VALUES
        ('start','execute','assign','Giao việc',0),
        ('execute','technical_review','submit_review','Gửi kiểm tra kỹ thuật',0),
        ('technical_review','execute','request_rework','Yêu cầu thực hiện lại',0),
        ('technical_review','completed','approve','Xác nhận hoàn thành',1)
      ) AS edge(source_key,target_key,action_key,label,sort_order)
      JOIN "workflow_nodes" source ON source.version_id = v.id AND source.key = edge.source_key
      JOIN "workflow_nodes" target ON target.version_id = v.id AND target.key = edge.target_key
      WHERE d.key = 'maintenance-standard' AND v.version_number = 1
      ON CONFLICT ("version_id","source_node_id","action_key") DO NOTHING`);

    await queryRunner.query(`INSERT INTO "workflow_assignee_rules"
      ("node_id","type","field_key","strategy","config")
      SELECT n.id, 'REQUEST_FIELD', 'assigneeId', 'ANY', '{}'::jsonb
      FROM "workflow_nodes" n
      JOIN "workflow_versions" v ON v.id = n.version_id
      JOIN "workflow_definitions" d ON d.id = v.definition_id
      WHERE d.key = 'maintenance-standard' AND n.key = 'execute'
        AND NOT EXISTS (SELECT 1 FROM "workflow_assignee_rules" r WHERE r.node_id = n.id)`);

    await queryRunner.query(`INSERT INTO "workflow_assignee_rules"
      ("node_id","type","field_key","strategy","config")
      SELECT n.id, 'REQUEST_FIELD', 'technicalReviewerId', 'ANY', '{}'::jsonb
      FROM "workflow_nodes" n
      JOIN "workflow_versions" v ON v.id = n.version_id
      JOIN "workflow_definitions" d ON d.id = v.definition_id
      WHERE d.key = 'maintenance-standard' AND n.key = 'technical_review'
        AND NOT EXISTS (SELECT 1 FROM "workflow_assignee_rules" r WHERE r.node_id = n.id)`);
  }

  private async backfillLegacyCmms(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "equipments" e
      SET site_id = only_site.id
      FROM (
        SELECT tenant_id, min(id::text)::uuid AS id
        FROM "sites" WHERE is_active = true
        GROUP BY tenant_id HAVING count(*) = 1
      ) only_site
      WHERE e.tenant_id = only_site.tenant_id AND e.site_id IS NULL`);

    await queryRunner.query(`UPDATE "work_orders" wo
      SET site_id = e.site_id
      FROM "equipments" e
      WHERE wo.equipment_id = e.id AND wo.site_id IS NULL`);

    await queryRunner.query(`INSERT INTO "maintenance_job_plans"
      ("id","tenant_id","code","name","description","status","created_at","updated_at")
      SELECT mp.id, mp.tenant_id, 'LEGACY-' || upper(substr(replace(mp.id::text,'-',''),1,8)),
        mp.title, mp.description, 'published', mp.created_at, mp.updated_at
      FROM "maintenance_plans" mp
      ON CONFLICT ("id") DO NOTHING`);

    await queryRunner.query(`INSERT INTO "maintenance_job_plan_versions"
      ("job_plan_id","version_number","status","published_at","created_at","updated_at")
      SELECT jp.id, 1, 'published', jp.created_at, jp.created_at, jp.updated_at
      FROM "maintenance_job_plans" jp
      WHERE jp.code LIKE 'LEGACY-%'
        AND NOT EXISTS (SELECT 1 FROM "maintenance_job_plan_versions" v WHERE v.job_plan_id = jp.id)`);

    await queryRunner.query(`UPDATE "maintenance_job_plans" jp
      SET current_version_id = v.id
      FROM "maintenance_job_plan_versions" v
      WHERE v.job_plan_id = jp.id AND jp.current_version_id IS NULL`);

    await queryRunner.query(`INSERT INTO "maintenance_schedules"
      ("id","tenant_id","site_id","code","name","description","job_plan_id",
       "workflow_definition_id","default_assignee_id",
       "default_technical_reviewer_id","status","timezone","start_date",
       "created_at","updated_at")
      SELECT mp.id, mp.tenant_id, e.site_id,
        'LEGACY-' || upper(substr(replace(mp.id::text,'-',''),1,8)),
        mp.title, mp.description, mp.id, wd.id,
        NULL, NULL,
        CASE WHEN mp.is_active THEN 'active' ELSE 'paused' END,
        t.timezone, coalesce(mp.next_due_date,current_date), mp.created_at, mp.updated_at
      FROM "maintenance_plans" mp
      JOIN "tenants" t ON t.id = mp.tenant_id
      JOIN "equipments" e ON e.id = mp.equipment_id
      JOIN "workflow_definitions" wd ON wd.tenant_id = mp.tenant_id AND wd.key = 'maintenance-standard'
      ON CONFLICT ("id") DO NOTHING`);

    await queryRunner.query(`INSERT INTO "maintenance_schedule_targets"
      ("schedule_id","target_type","target_id")
      SELECT mp.id, 'EQUIPMENT', mp.equipment_id
      FROM "maintenance_plans" mp
      ON CONFLICT ("schedule_id","target_type","target_id") DO NOTHING`);

    await queryRunner.query(`INSERT INTO "maintenance_triggers"
      ("schedule_id","type","config","next_due_at","is_active")
      SELECT mp.id,
        CASE WHEN mp.frequency_days IS NULL THEN 'CONDITION' ELSE 'TIME_RRULE' END::"public"."maintenance_triggers_type_enum",
        CASE WHEN mp.frequency_days IS NULL
          THEN '{"mode":"manual"}'::jsonb
          ELSE jsonb_build_object(
            'rrule','FREQ=DAILY;INTERVAL=' || mp.frequency_days,
            'legacyFrequencyDays',mp.frequency_days
          )
        END,
        CASE WHEN mp.next_due_date IS NULL THEN NULL
          ELSE (mp.next_due_date::timestamp AT TIME ZONE t.timezone)
        END,
        mp.is_active AND mp.frequency_days IS NOT NULL
      FROM "maintenance_plans" mp
      JOIN "tenants" t ON t.id = mp.tenant_id
      WHERE NOT EXISTS (SELECT 1 FROM "maintenance_triggers" mt WHERE mt.schedule_id = mp.id)`);

    await queryRunner.query(`INSERT INTO "workflow_instances"
      ("tenant_id","definition_id","version_id","resource_type","resource_id",
       "current_node_id","status","context","started_at","completed_at")
      SELECT wo.tenant_id, wd.id, wv.id, 'maintenance_work_order', wo.id, wn.id,
        CASE
          WHEN wo.status IN ('COMPLETED','CLOSED') THEN 'completed'
          ELSE 'running'
        END,
        jsonb_build_object('assigneeId',wo.assignee_id,'legacyStatus',wo.status),
        wo.created_at,
        CASE WHEN wo.status IN ('COMPLETED','CLOSED') THEN coalesce(wo.end_time,wo.updated_at) ELSE NULL END
      FROM "work_orders" wo
      JOIN "workflow_definitions" wd ON wd.tenant_id = wo.tenant_id AND wd.key = 'maintenance-standard'
      JOIN "workflow_versions" wv ON wv.id = wd.current_version_id
      JOIN "workflow_nodes" wn ON wn.version_id = wv.id AND wn.key = CASE
        WHEN wo.status = 'DRAFT' THEN 'start'
        WHEN wo.status IN ('ASSIGNED','IN_PROGRESS') THEN 'execute'
        WHEN wo.status IN ('COMPLETED','CLOSED') THEN 'completed'
        ELSE 'start'
      END
      WHERE NOT EXISTS (
        SELECT 1 FROM "workflow_instances" wi
        WHERE wi.tenant_id = wo.tenant_id
          AND wi.resource_type = 'maintenance_work_order'
          AND wi.resource_id = wo.id
      )`);

    await queryRunner.query(`UPDATE "work_orders" wo
      SET workflow_instance_id = wi.id
      FROM "workflow_instances" wi
      WHERE wi.tenant_id = wo.tenant_id
        AND wi.resource_type = 'maintenance_work_order'
        AND wi.resource_id = wo.id
        AND wo.workflow_instance_id IS NULL`);

    await queryRunner.query(`INSERT INTO "workflow_tokens"
      ("instance_id","node_id","status","created_at","consumed_at")
      SELECT wi.id, wi.current_node_id,
        CASE WHEN wi.status = 'running' THEN 'active' ELSE 'consumed' END,
        wi.started_at,
        CASE WHEN wi.status = 'running' THEN NULL ELSE wi.completed_at END
      FROM "workflow_instances" wi
      WHERE wi.resource_type = 'maintenance_work_order'
        AND wi.current_node_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "workflow_tokens" tok WHERE tok.instance_id = wi.id)`);

    await queryRunner.query(`INSERT INTO "workflow_tasks"
      ("instance_id","node_id","name","status","claimed_by","activated_at")
      SELECT wi.id, wi.current_node_id, wn.name,
        CASE WHEN wo.status = 'IN_PROGRESS' THEN 'claimed' ELSE 'pending' END,
        CASE WHEN wo.status = 'IN_PROGRESS' THEN wo.assignee_id ELSE NULL END,
        coalesce(wo.start_time,wo.created_at)
      FROM "workflow_instances" wi
      JOIN "work_orders" wo ON wo.id = wi.resource_id
      JOIN "workflow_nodes" wn ON wn.id = wi.current_node_id
      WHERE wi.resource_type = 'maintenance_work_order'
        AND wi.status = 'running'
        AND wn.type = 'HUMAN_TASK'
        AND NOT EXISTS (SELECT 1 FROM "workflow_tasks" wt WHERE wt.instance_id = wi.id)`);

    await queryRunner.query(`INSERT INTO "workflow_task_assignments"
      ("task_id","user_id","type")
      SELECT wt.id, wo.assignee_id, 'assignee'
      FROM "workflow_tasks" wt
      JOIN "workflow_instances" wi ON wi.id = wt.instance_id
      JOIN "work_orders" wo ON wo.id = wi.resource_id
      WHERE wo.assignee_id IS NOT NULL
      ON CONFLICT ("task_id","user_id") DO NOTHING`);

    await queryRunner.query(`INSERT INTO "workflow_actions"
      ("tenant_id","instance_id","actor_id","action_key","to_node_id","note","payload","created_at")
      SELECT wol.tenant_id, wi.id, wol.user_id, lower(wol.action), wi.current_node_id,
        wol.note, '{"source":"legacy"}'::jsonb, wol.created_at
      FROM "work_order_logs" wol
      JOIN "workflow_instances" wi
        ON wi.resource_type = 'maintenance_work_order'
       AND wi.resource_id = wol.work_order_id
       AND wi.tenant_id = wol.tenant_id`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "maintenance_occurrences" DROP CONSTRAINT "FK_maintenance_occurrences_work_order"`,
    );
    await queryRunner.query(`DROP TABLE "work_order_checklist_results"`);
    await queryRunner.query(`DROP TABLE "work_order_updates"`);
    await queryRunner.query(`ALTER TABLE "work_orders"
      DROP CONSTRAINT "FK_work_orders_workflow_instance",
      DROP CONSTRAINT "FK_work_orders_job_plan_version",
      DROP CONSTRAINT "FK_work_orders_occurrence",
      DROP CONSTRAINT "FK_work_orders_schedule",
      DROP CONSTRAINT "FK_work_orders_site",
      DROP COLUMN "custom_fields",
      DROP COLUMN "workflow_instance_id",
      DROP COLUMN "job_plan_version_id",
      DROP COLUMN "maintenance_occurrence_id",
      DROP COLUMN "maintenance_schedule_id",
      DROP COLUMN "progress_percent",
      DROP COLUMN "due_at",
      DROP COLUMN "planned_start_at",
      DROP COLUMN "site_id"`);
    await queryRunner.query(`ALTER TABLE "equipments"
      DROP CONSTRAINT "FK_equipments_site",
      DROP COLUMN "site_id"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "equipment_meter_readings"`);
    await queryRunner.query(`DROP TABLE "equipment_meters"`);
    await queryRunner.query(`DROP TABLE "maintenance_occurrences"`);
    await queryRunner.query(`DROP TABLE "maintenance_triggers"`);
    await queryRunner.query(`DROP TABLE "maintenance_schedule_targets"`);
    await queryRunner.query(`DROP TABLE "maintenance_schedules"`);
    await queryRunner.query(`DROP TABLE "equipment_group_members"`);
    await queryRunner.query(`DROP TABLE "equipment_groups"`);
    await queryRunner.query(`DROP TABLE "maintenance_job_plan_steps"`);
    await queryRunner.query(
      `ALTER TABLE "maintenance_job_plans" DROP CONSTRAINT "FK_maintenance_job_plans_current_version"`,
    );
    await queryRunner.query(`DROP TABLE "maintenance_job_plan_versions"`);
    await queryRunner.query(`DROP TABLE "maintenance_job_plans"`);
    await queryRunner.query(`DROP TABLE "workflow_actions"`);
    await queryRunner.query(`DROP TABLE "workflow_task_assignments"`);
    await queryRunner.query(`DROP TABLE "workflow_tasks"`);
    await queryRunner.query(`DROP TABLE "workflow_tokens"`);
    await queryRunner.query(`DROP TABLE "workflow_instances"`);
    await queryRunner.query(`DROP TABLE "workflow_assignee_rules"`);
    await queryRunner.query(`DROP TABLE "workflow_transitions"`);
    await queryRunner.query(`DROP TABLE "workflow_nodes"`);
    await queryRunner.query(
      `ALTER TABLE "workflow_definitions" DROP CONSTRAINT "FK_workflow_definitions_current_version"`,
    );
    await queryRunner.query(`DROP TABLE "workflow_versions"`);
    await queryRunner.query(`DROP TABLE "workflow_definitions"`);
    await queryRunner.query(
      `DROP TYPE "public"."work_order_updates_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."maintenance_triggers_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."maintenance_schedule_targets_target_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."maintenance_job_plan_steps_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."workflow_assignee_rules_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."workflow_nodes_type_enum"`);
  }
}
