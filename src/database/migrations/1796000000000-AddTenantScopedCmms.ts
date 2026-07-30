import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantScopedCmms1796000000000 implements MigrationInterface {
  name = 'AddTenantScopedCmms1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."work_orders_type_enum" AS ENUM ('INCIDENT', 'MAINTENANCE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."work_orders_status_enum" AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED')`,
    );

    await queryRunner.query(`CREATE TABLE "equipments" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tenant_id" uuid NOT NULL,
      "parent_id" uuid,
      "code" varchar(100) NOT NULL,
      "name" varchar(255) NOT NULL,
      "category" varchar(100),
      "status" varchar(50) NOT NULL DEFAULT 'ACTIVE',
      "installation_date" date,
      "specs" jsonb,
      "description" text,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_equipments" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_equipments_tenant_code" UNIQUE ("tenant_id", "code"),
      CONSTRAINT "FK_equipments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_equipments_parent" FOREIGN KEY ("parent_id") REFERENCES "equipments"("id") ON DELETE SET NULL
    )`);

    await queryRunner.query(`CREATE TABLE "equipment_documents" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "equipment_id" uuid NOT NULL,
      "name" varchar(255) NOT NULL, "type" varchar(100), "file_url" varchar(500) NOT NULL,
      "description" text, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_equipment_documents" PRIMARY KEY ("id"),
      CONSTRAINT "FK_equipment_documents_equipment" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "warehouses" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL,
      "code" varchar(50) NOT NULL, "name" varchar(255) NOT NULL, "location" text,
      "is_active" boolean NOT NULL DEFAULT true, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_warehouses" PRIMARY KEY ("id"), CONSTRAINT "UQ_warehouses_tenant_code" UNIQUE ("tenant_id", "code"),
      CONSTRAINT "FK_warehouses_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "materials" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL,
      "code" varchar(100) NOT NULL, "name" varchar(255) NOT NULL, "category" varchar(100), "unit" varchar(50) NOT NULL,
      "min_stock" integer NOT NULL DEFAULT 0, "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_materials" PRIMARY KEY ("id"), CONSTRAINT "UQ_materials_tenant_code" UNIQUE ("tenant_id", "code"),
      CONSTRAINT "FK_materials_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "material_inventory" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "material_id" uuid NOT NULL,
      "quantity" integer NOT NULL DEFAULT 0, "location" varchar(100), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_material_inventory" PRIMARY KEY ("id"), CONSTRAINT "UQ_material_inventory_tenant_warehouse_material" UNIQUE ("tenant_id", "warehouse_id", "material_id"),
      CONSTRAINT "FK_material_inventory_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_material_inventory_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_material_inventory_material" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "inventory_transactions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "material_id" uuid NOT NULL,
      "type" varchar(50) NOT NULL, "quantity" integer NOT NULL, "reference_id" uuid, "note" text, "created_by" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_inventory_transactions" PRIMARY KEY ("id"),
      CONSTRAINT "FK_inventory_transactions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_inventory_transactions_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id"),
      CONSTRAINT "FK_inventory_transactions_material" FOREIGN KEY ("material_id") REFERENCES "materials"("id"),
      CONSTRAINT "FK_inventory_transactions_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    )`);

    await queryRunner.query(`CREATE TABLE "work_orders" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "code" varchar(100) NOT NULL, "title" varchar(255) NOT NULL,
      "description" text, "type" "public"."work_orders_type_enum" NOT NULL,
      "status" "public"."work_orders_status_enum" NOT NULL DEFAULT 'DRAFT', "priority" varchar(50) NOT NULL DEFAULT 'NORMAL',
      "equipment_id" uuid, "reporter_id" uuid, "assignee_id" uuid, "start_time" timestamptz, "end_time" timestamptz,
      "downtime_minutes" integer NOT NULL DEFAULT 0, "root_cause" text, "attachments" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_work_orders" PRIMARY KEY ("id"), CONSTRAINT "UQ_work_orders_tenant_code" UNIQUE ("tenant_id", "code"),
      CONSTRAINT "FK_work_orders_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_work_orders_equipment" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_work_orders_reporter" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_work_orders_assignee" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL
    )`);

    await queryRunner.query(`CREATE TABLE "work_order_logs" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "work_order_id" uuid NOT NULL, "user_id" uuid NOT NULL,
      "action" varchar(100) NOT NULL, "note" text, "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_work_order_logs" PRIMARY KEY ("id"),
      CONSTRAINT "FK_work_order_logs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_work_order_logs_order" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_work_order_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE "work_order_materials" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "work_order_id" uuid NOT NULL, "material_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL,
      "quantity" integer NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_work_order_materials" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_work_order_materials" UNIQUE ("work_order_id", "warehouse_id", "material_id"),
      CONSTRAINT "FK_work_order_materials_order" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_work_order_materials_material" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_work_order_materials_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT
    )`);

    await queryRunner.query(`CREATE TABLE "maintenance_plans" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "equipment_id" uuid NOT NULL, "title" varchar(255) NOT NULL,
      "description" text, "frequency_days" integer, "next_due_date" date, "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_maintenance_plans" PRIMARY KEY ("id"),
      CONSTRAINT "FK_maintenance_plans_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_maintenance_plans_equipment" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE CASCADE
    )`);

    for (const [table, column] of [
      ['equipments', 'tenant_id'],
      ['warehouses', 'tenant_id'],
      ['materials', 'tenant_id'],
      ['material_inventory', 'tenant_id'],
      ['inventory_transactions', 'tenant_id'],
      ['work_orders', 'tenant_id'],
      ['work_order_logs', 'tenant_id'],
      ['maintenance_plans', 'tenant_id'],
      ['equipment_documents', 'equipment_id'],
      ['work_order_materials', 'work_order_id'],
    ]) {
      await queryRunner.query(
        `CREATE INDEX "IDX_${table}_${column}" ON "${table}" ("${column}")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "maintenance_plans"`);
    await queryRunner.query(`DROP TABLE "work_order_materials"`);
    await queryRunner.query(`DROP TABLE "work_order_logs"`);
    await queryRunner.query(`DROP TABLE "work_orders"`);
    await queryRunner.query(`DROP TABLE "inventory_transactions"`);
    await queryRunner.query(`DROP TABLE "material_inventory"`);
    await queryRunner.query(`DROP TABLE "materials"`);
    await queryRunner.query(`DROP TABLE "warehouses"`);
    await queryRunner.query(`DROP TABLE "equipment_documents"`);
    await queryRunner.query(`DROP TABLE "equipments"`);
    await queryRunner.query(`DROP TYPE "public"."work_orders_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."work_orders_type_enum"`);
  }
}
