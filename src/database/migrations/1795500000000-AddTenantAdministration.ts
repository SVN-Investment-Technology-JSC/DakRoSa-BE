import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantAdministration1795500000000 implements MigrationInterface {
  name = 'AddTenantAdministration1795500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN is_platform_admin boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD COLUMN enabled_modules jsonb NOT NULL DEFAULT
        '["core","administration","e-office","digital-signature","organization"]'::jsonb
    `);
    await queryRunner.query(`
      CREATE TABLE organization_units (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        parent_id uuid REFERENCES organization_units(id) ON DELETE RESTRICT,
        code varchar(60) NOT NULL,
        name varchar(180) NOT NULL,
        type varchar(40) NOT NULL DEFAULT 'department',
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_organization_units_tenant_code" UNIQUE (tenant_id, code)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_organization_units_tenant_id ON organization_units(tenant_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_organization_units_parent_id ON organization_units(parent_id)',
    );
    await queryRunner.query(`
      CREATE TABLE positions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        organization_unit_id uuid REFERENCES organization_units(id) ON DELETE SET NULL,
        code varchar(60) NOT NULL,
        name varchar(180) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_positions_tenant_code" UNIQUE (tenant_id, code)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_positions_tenant_id ON positions(tenant_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_positions_organization_unit_id ON positions(organization_unit_id)',
    );
    await queryRunner.query(`
      ALTER TABLE tenant_memberships
      ADD COLUMN organization_unit_id uuid REFERENCES organization_units(id) ON DELETE SET NULL,
      ADD COLUMN position_id uuid REFERENCES positions(id) ON DELETE SET NULL,
      ADD COLUMN data_scope varchar(30) NOT NULL DEFAULT 'tenant',
      ADD CONSTRAINT tenant_memberships_data_scope_valid
        CHECK (data_scope IN ('tenant', 'organization_unit', 'site', 'own'))
    `);
    await queryRunner.query(
      'CREATE INDEX idx_tenant_memberships_organization_unit_id ON tenant_memberships(organization_unit_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_tenant_memberships_position_id ON tenant_memberships(position_id)',
    );

    for (const table of ['organization_units', 'positions']) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation ON ${table}
        USING (
          tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        WITH CHECK (
          tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE tenant_memberships DROP CONSTRAINT tenant_memberships_data_scope_valid',
    );
    await queryRunner.query(
      'ALTER TABLE tenant_memberships DROP COLUMN data_scope',
    );
    await queryRunner.query(
      'ALTER TABLE tenant_memberships DROP COLUMN position_id',
    );
    await queryRunner.query(
      'ALTER TABLE tenant_memberships DROP COLUMN organization_unit_id',
    );
    await queryRunner.query('DROP TABLE positions');
    await queryRunner.query('DROP TABLE organization_units');
    await queryRunner.query('ALTER TABLE tenants DROP COLUMN enabled_modules');
    await queryRunner.query('ALTER TABLE users DROP COLUMN is_platform_admin');
  }
}
