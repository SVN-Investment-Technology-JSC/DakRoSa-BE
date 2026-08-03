import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Kept as a compatibility marker for databases that discovered this migration.
 * The root_cause column is created by AddTenantScopedCmms1796000000000.
 */
export class AddRootCauseToWorkOrder1795520000000 implements MigrationInterface {
  name = 'AddRootCauseToWorkOrder1795520000000';

  public up(_queryRunner: QueryRunner): Promise<void> {
    return Promise.resolve();
  }

  public down(_queryRunner: QueryRunner): Promise<void> {
    return Promise.resolve();
  }
}
