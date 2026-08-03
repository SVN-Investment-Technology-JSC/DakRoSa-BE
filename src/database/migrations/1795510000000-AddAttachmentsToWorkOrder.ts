import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Kept as a compatibility marker for databases that discovered this migration.
 * The attachments column is created by AddTenantScopedCmms1796000000000.
 */
export class AddAttachmentsToWorkOrder1795510000000 implements MigrationInterface {
  name = 'AddAttachmentsToWorkOrder1795510000000';

  public up(_queryRunner: QueryRunner): Promise<void> {
    return Promise.resolve();
  }

  public down(_queryRunner: QueryRunner): Promise<void> {
    return Promise.resolve();
  }
}
