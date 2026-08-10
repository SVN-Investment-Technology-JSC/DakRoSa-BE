import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatrixOrganization1796700000000 implements MigrationInterface {
  name = 'AddMatrixOrganization1796700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE personnel (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id uuid REFERENCES users(id) ON DELETE SET NULL, employee_code varchar(60) NOT NULL, full_name varchar(180) NOT NULL,
      phone varchar(30), email varchar(254), status varchar(30) NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_personnel_tenant_employee_code" UNIQUE (tenant_id, employee_code))`);
    await queryRunner.query('CREATE INDEX idx_personnel_tenant_id ON personnel(tenant_id)');
    await queryRunner.query('CREATE INDEX idx_personnel_user_id ON personnel(user_id)');
    await queryRunner.query(`CREATE TABLE personnel_assignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      personnel_id uuid NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
      organization_unit_id uuid NOT NULL REFERENCES organization_units(id) ON DELETE RESTRICT,
      position_id uuid NOT NULL REFERENCES positions(id) ON DELETE RESTRICT, is_primary boolean NOT NULL DEFAULT false,
      rank smallint NOT NULL DEFAULT 3 CHECK (rank >= 1), start_date date NOT NULL, end_date date,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query('CREATE INDEX idx_personnel_assignments_tenant_id ON personnel_assignments(tenant_id)');
    await queryRunner.query('CREATE INDEX idx_personnel_assignments_org_position ON personnel_assignments(organization_unit_id, position_id)');
    await queryRunner.query('CREATE UNIQUE INDEX uq_personnel_assignments_active_position ON personnel_assignments(personnel_id, organization_unit_id, position_id) WHERE end_date IS NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE personnel_assignments');
    await queryRunner.query('DROP TABLE personnel');
  }
}
