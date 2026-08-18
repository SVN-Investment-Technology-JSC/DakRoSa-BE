import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpgradeWarehouseAndInventoryModule1797100000000
  implements MigrationInterface
{
  name = 'UpgradeWarehouseAndInventoryModule1797100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Nâng cấp bảng warehouses (thêm org_unit_id và manager_user_id)
    await queryRunner.query(`
      ALTER TABLE "warehouses"
      ADD COLUMN "org_unit_id" uuid NULL,
      ADD COLUMN "manager_user_id" uuid NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "warehouses"
      ADD CONSTRAINT "FK_warehouses_org_unit"
      FOREIGN KEY ("org_unit_id") REFERENCES "organization_units"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "warehouses"
      ADD CONSTRAINT "FK_warehouses_manager_user"
      FOREIGN KEY ("manager_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_warehouses_org_unit_id" ON "warehouses" ("org_unit_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_warehouses_manager_user_id" ON "warehouses" ("manager_user_id");
    `);

    // 2. Tạo mới bảng warehouse_locations (Sơ đồ Vị trí Kệ / Ngăn / Bin trong Kho)
    await queryRunner.query(`
      CREATE TABLE "warehouse_locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "warehouse_id" uuid NOT NULL,
        "code" varchar(50) NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_warehouse_locations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_warehouse_locations_warehouse_code" UNIQUE ("warehouse_id", "code"),
        CONSTRAINT "FK_warehouse_locations_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_warehouse_locations_warehouse_id" ON "warehouse_locations" ("warehouse_id");
    `);

    // 3. Nâng cấp bảng materials (Master Data Danh mục Vật tư: specifications, manufacturer, max_stock)
    await queryRunner.query(`
      ALTER TABLE "materials"
      ADD COLUMN "specifications" text NULL,
      ADD COLUMN "manufacturer" varchar(255) NULL,
      ADD COLUMN "max_stock" integer NOT NULL DEFAULT 0;
    `);

    // 4. Nâng cấp bảng material_inventory (quantity_reserved, location_id)
    await queryRunner.query(`
      ALTER TABLE "material_inventory"
      ADD COLUMN "quantity_reserved" integer NOT NULL DEFAULT 0,
      ADD COLUMN "location_id" uuid NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "material_inventory"
      ADD CONSTRAINT "FK_material_inventory_location"
      FOREIGN KEY ("location_id") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_material_inventory_location_id" ON "material_inventory" ("location_id");
    `);

    // 5. Nâng cấp bảng inventory_transactions (transaction_code, reference_type, workflow_request_id)
    await queryRunner.query(`
      ALTER TABLE "inventory_transactions"
      ADD COLUMN "transaction_code" varchar(100) NULL,
      ADD COLUMN "reference_type" varchar(50) NULL,
      ADD COLUMN "workflow_request_id" uuid NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_transactions_reference" ON "inventory_transactions" ("reference_type", "reference_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_transactions_workflow_request_id" ON "inventory_transactions" ("workflow_request_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 5. Rollback inventory_transactions
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_inventory_transactions_workflow_request_id";
      DROP INDEX IF EXISTS "IDX_inventory_transactions_reference";
      ALTER TABLE "inventory_transactions"
      DROP COLUMN IF EXISTS "workflow_request_id",
      DROP COLUMN IF EXISTS "reference_type",
      DROP COLUMN IF EXISTS "transaction_code";
    `);

    // 4. Rollback material_inventory
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_material_inventory_location_id";
      ALTER TABLE "material_inventory"
      DROP CONSTRAINT IF EXISTS "FK_material_inventory_location";
      ALTER TABLE "material_inventory"
      DROP COLUMN IF EXISTS "location_id",
      DROP COLUMN IF EXISTS "quantity_reserved";
    `);

    // 3. Rollback materials
    await queryRunner.query(`
      ALTER TABLE "materials"
      DROP COLUMN IF EXISTS "max_stock",
      DROP COLUMN IF EXISTS "manufacturer",
      DROP COLUMN IF EXISTS "specifications";
    `);

    // 2. Rollback warehouse_locations
    await queryRunner.query(`
      DROP TABLE IF EXISTS "warehouse_locations";
    `);

    // 1. Rollback warehouses
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_warehouses_manager_user_id";
      DROP INDEX IF EXISTS "IDX_warehouses_org_unit_id";
      ALTER TABLE "warehouses"
      DROP CONSTRAINT IF EXISTS "FK_warehouses_manager_user";
      ALTER TABLE "warehouses"
      DROP CONSTRAINT IF EXISTS "FK_warehouses_org_unit";
      ALTER TABLE "warehouses"
      DROP COLUMN IF EXISTS "manager_user_id",
      DROP COLUMN IF EXISTS "org_unit_id";
    `);
  }
}
