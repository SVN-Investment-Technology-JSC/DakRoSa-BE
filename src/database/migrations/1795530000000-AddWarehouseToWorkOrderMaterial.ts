import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Kept as a compatibility marker for databases that discovered this migration.
 * The warehouse_id column and foreign key are created by
 * AddTenantScopedCmms1796000000000.
 */
export class AddWarehouseToWorkOrderMaterial1795530000000 implements MigrationInterface {
  name = 'AddWarehouseToWorkOrderMaterial1795530000000';

  public up(_queryRunner: QueryRunner): Promise<void> {
    return Promise.resolve();
  }

  public down(_queryRunner: QueryRunner): Promise<void> {
    return Promise.resolve();
  }
}
