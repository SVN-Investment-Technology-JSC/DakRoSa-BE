import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Kept as a compatibility marker for databases that discovered this migration.
 * Tenant-scoped CMMS tables, indexes and constraints are created by
 * AddTenantScopedCmms1796000000000.
 */
export class AddTenantIdToCMMS1795550000000 implements MigrationInterface {
  name = 'AddTenantIdToCMMS1795550000000';

  public up(_queryRunner: QueryRunner): Promise<void> {
    return Promise.resolve();
  }

  public down(_queryRunner: QueryRunner): Promise<void> {
    return Promise.resolve();
  }
}
