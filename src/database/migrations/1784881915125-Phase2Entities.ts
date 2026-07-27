import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2Entities1784881915125 implements MigrationInterface {
  name = 'Phase2Entities1784881915125';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "equipments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "parent_id" uuid, "code" character varying(100) NOT NULL, "name" character varying(255) NOT NULL, "category" character varying(100), "status" character varying(50) NOT NULL DEFAULT 'ACTIVE', "installation_date" date, "specs" jsonb, "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_b2c714ed13fbd80aa4f55c0aea7" UNIQUE ("code"), CONSTRAINT "PK_250348d5d9ae4946bcd634f3e61" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "equipment_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "equipment_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "type" character varying(100), "file_url" character varying(500) NOT NULL, "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3509f69e94a1c35abf68fe535d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "warehouses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "location" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_d8b96d60ff9a288f5ed862280d9" UNIQUE ("code"), CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "materials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(100) NOT NULL, "name" character varying(255) NOT NULL, "category" character varying(100), "unit" character varying(50) NOT NULL, "min_stock" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_5f59d61b51ffcb1db9942862215" UNIQUE ("code"), CONSTRAINT "PK_2fd1a93ecb222a28bef28663fa0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "material_inventory" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "warehouse_id" uuid NOT NULL, "material_id" uuid NOT NULL, "quantity" integer NOT NULL DEFAULT '0', "location" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_31919bb81c5c24593e6510c87d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "warehouse_id" uuid NOT NULL, "material_id" uuid NOT NULL, "type" character varying(50) NOT NULL, "quantity" integer NOT NULL, "reference_id" uuid, "note" text, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9b7144851f08f9eededde7edd42" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."work_orders_type_enum" AS ENUM('INCIDENT', 'MAINTENANCE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."work_orders_status_enum" AS ENUM('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "work_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(100) NOT NULL, "title" character varying(255) NOT NULL, "description" text, "type" "public"."work_orders_type_enum" NOT NULL, "status" "public"."work_orders_status_enum" NOT NULL DEFAULT 'DRAFT', "priority" character varying(50) NOT NULL DEFAULT 'NORMAL', "equipment_id" uuid, "reporter_id" uuid, "assignee_id" uuid, "start_time" TIMESTAMP WITH TIME ZONE, "end_time" TIMESTAMP WITH TIME ZONE, "downtime_minutes" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ca7b6602b744e246946406bd49a" UNIQUE ("code"), CONSTRAINT "PK_29f6c1884082ee6f535aed93660" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "work_order_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "work_order_id" uuid NOT NULL, "user_id" uuid NOT NULL, "action" character varying(100) NOT NULL, "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f21127067c91a0b0882e060e616" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "work_order_materials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "work_order_id" uuid NOT NULL, "material_id" uuid NOT NULL, "quantity" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ef5cf27418c13b17bdf514e58f8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "maintenance_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "equipment_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" text, "frequency_days" integer, "next_due_date" date, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bc2a330993cedb65505a154ac5d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "equipments" ADD CONSTRAINT "FK_71de44396bcb488769c7df5cbe3" FOREIGN KEY ("parent_id") REFERENCES "equipments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "equipment_documents" ADD CONSTRAINT "FK_c1154af788f437b09c3b1c240f8" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "material_inventory" ADD CONSTRAINT "FK_d43eaf7ae8b14495c1e95ab5771" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "material_inventory" ADD CONSTRAINT "FK_196b19790f38a237240adb52959" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_d49bcd38118deceaeb969a54e4f" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_27111e3d0262799c28ca96e3368" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_d9a2ac973b889087b33f84d3517" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD CONSTRAINT "FK_d32006339c17274522170264915" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD CONSTRAINT "FK_9c1631b04d686bd0cdaca9e0e25" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD CONSTRAINT "FK_05b6760717afdaf9d47729378aa" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_logs" ADD CONSTRAINT "FK_83f0bab24ae0c51ceff71783d0d" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_logs" ADD CONSTRAINT "FK_b46d0e0bb80f23ea700e91fd859" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_materials" ADD CONSTRAINT "FK_259c6f46d9485959a5912a4b678" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_materials" ADD CONSTRAINT "FK_062155b1581f3519437d4dc2eb2" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_plans" ADD CONSTRAINT "FK_38f013990c92480e7b45b520054" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "maintenance_plans" DROP CONSTRAINT "FK_38f013990c92480e7b45b520054"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_materials" DROP CONSTRAINT "FK_062155b1581f3519437d4dc2eb2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_materials" DROP CONSTRAINT "FK_259c6f46d9485959a5912a4b678"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_logs" DROP CONSTRAINT "FK_b46d0e0bb80f23ea700e91fd859"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_logs" DROP CONSTRAINT "FK_83f0bab24ae0c51ceff71783d0d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP CONSTRAINT "FK_05b6760717afdaf9d47729378aa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP CONSTRAINT "FK_9c1631b04d686bd0cdaca9e0e25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP CONSTRAINT "FK_d32006339c17274522170264915"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_d9a2ac973b889087b33f84d3517"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_27111e3d0262799c28ca96e3368"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_d49bcd38118deceaeb969a54e4f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "material_inventory" DROP CONSTRAINT "FK_196b19790f38a237240adb52959"`,
    );
    await queryRunner.query(
      `ALTER TABLE "material_inventory" DROP CONSTRAINT "FK_d43eaf7ae8b14495c1e95ab5771"`,
    );
    await queryRunner.query(
      `ALTER TABLE "equipment_documents" DROP CONSTRAINT "FK_c1154af788f437b09c3b1c240f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "equipments" DROP CONSTRAINT "FK_71de44396bcb488769c7df5cbe3"`,
    );
    await queryRunner.query(`DROP TABLE "maintenance_plans"`);
    await queryRunner.query(`DROP TABLE "work_order_materials"`);
    await queryRunner.query(`DROP TABLE "work_order_logs"`);
    await queryRunner.query(`DROP TABLE "work_orders"`);
    await queryRunner.query(`DROP TYPE "public"."work_orders_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."work_orders_type_enum"`);
    await queryRunner.query(`DROP TABLE "inventory_transactions"`);
    await queryRunner.query(`DROP TABLE "material_inventory"`);
    await queryRunner.query(`DROP TABLE "materials"`);
    await queryRunner.query(`DROP TABLE "warehouses"`);
    await queryRunner.query(`DROP TABLE "equipment_documents"`);
    await queryRunner.query(`DROP TABLE "equipments"`);
  }
}
