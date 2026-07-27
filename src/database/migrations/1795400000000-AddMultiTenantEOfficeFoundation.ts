import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiTenantEOfficeFoundation1795400000000 implements MigrationInterface {
  name = 'AddMultiTenantEOfficeFoundation1795400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug varchar(80) NOT NULL UNIQUE,
        code varchar(40) NOT NULL UNIQUE,
        name varchar(180) NOT NULL,
        short_name varchar(100) NOT NULL,
        status varchar(30) NOT NULL DEFAULT 'active',
        locale varchar(10) NOT NULL DEFAULT 'vi-VN',
        timezone varchar(60) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        primary_color varchar(20) NOT NULL DEFAULT '#386948',
        logo_url varchar(500),
        settings jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tenants_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_tenants_status ON tenants(status)',
    );
    await queryRunner.query(`
      INSERT INTO tenants (
        slug,
        code,
        name,
        short_name,
        logo_url
      )
      VALUES (
        'dakrosa',
        'DAKROSA',
        'Công ty Cổ phần Thủy điện ĐăkRơSa',
        'EVN HPC ĐăkRơSa',
        '/brand/dakrosa-logo.jpg'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE sites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        code varchar(40) NOT NULL,
        name varchar(180) NOT NULL,
        type varchar(40) NOT NULL DEFAULT 'plant',
        is_active boolean NOT NULL DEFAULT true,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_sites_tenant_code" UNIQUE (tenant_id, code)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_sites_tenant_id ON sites(tenant_id)',
    );
    await queryRunner.query(`
      INSERT INTO sites (tenant_id, code, name)
      SELECT id, 'DAKROSA-PLANT', 'Nhà máy Thủy điện ĐăkRơSa'
      FROM tenants
      WHERE slug = 'dakrosa'
    `);

    await queryRunner.query(
      'ALTER TABLE roles ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE',
    );
    await queryRunner.query(`
      UPDATE roles
      SET tenant_id = (SELECT id FROM tenants WHERE slug = 'dakrosa')
    `);
    await queryRunner.query(
      'ALTER TABLE roles ALTER COLUMN tenant_id SET NOT NULL',
    );
    await queryRunner.query('ALTER TABLE roles DROP CONSTRAINT roles_code_key');
    await queryRunner.query(
      'ALTER TABLE roles ADD CONSTRAINT "UQ_roles_tenant_code" UNIQUE (tenant_id, code)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_roles_tenant_id ON roles(tenant_id)',
    );

    await queryRunner.query(`
      CREATE TABLE tenant_memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status varchar(30) NOT NULL DEFAULT 'active',
        is_default boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tenant_memberships_tenant_user" UNIQUE (tenant_id, user_id)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_tenant_memberships_tenant_id ON tenant_memberships(tenant_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_tenant_memberships_user_id ON tenant_memberships(user_id)',
    );
    await queryRunner.query(`
      INSERT INTO tenant_memberships (tenant_id, user_id, is_default)
      SELECT tenant.id, users.id, true
      FROM tenants tenant
      CROSS JOIN users
      WHERE tenant.slug = 'dakrosa'
    `);
    await queryRunner.query(`
      CREATE TABLE membership_roles (
        membership_id uuid NOT NULL REFERENCES tenant_memberships(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        PRIMARY KEY (membership_id, role_id)
      )
    `);
    await queryRunner.query(`
      INSERT INTO membership_roles (membership_id, role_id)
      SELECT membership.id, user_role.role_id
      FROM user_roles user_role
      JOIN tenant_memberships membership ON membership.user_id = user_role.user_id
      JOIN roles role
        ON role.id = user_role.role_id
       AND role.tenant_id = membership.tenant_id
    `);

    await queryRunner.query(
      'ALTER TABLE auth_sessions ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE auth_sessions ADD COLUMN membership_id uuid REFERENCES tenant_memberships(id) ON DELETE CASCADE',
    );
    await queryRunner.query(`
      UPDATE auth_sessions session
      SET
        tenant_id = membership.tenant_id,
        membership_id = membership.id
      FROM tenant_memberships membership
      WHERE membership.user_id = session.user_id
        AND membership.is_default = true
    `);
    await queryRunner.query(
      'ALTER TABLE auth_sessions ALTER COLUMN tenant_id SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE auth_sessions ALTER COLUMN membership_id SET NOT NULL',
    );
    await queryRunner.query(
      'CREATE INDEX idx_auth_sessions_tenant_id ON auth_sessions(tenant_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_auth_sessions_membership_id ON auth_sessions(membership_id)',
    );

    await queryRunner.query(
      'ALTER TABLE audit_logs ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL',
    );
    await queryRunner.query(`
      UPDATE audit_logs audit
      SET tenant_id = membership.tenant_id
      FROM tenant_memberships membership
      WHERE membership.user_id = audit.user_id
        AND membership.is_default = true
    `);
    await queryRunner.query(
      'CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id)',
    );

    await queryRunner.query(`
      CREATE TABLE submissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        code varchar(40) NOT NULL,
        title varchar(220) NOT NULL,
        summary text,
        document_type varchar(80) NOT NULL,
        priority varchar(20) NOT NULL DEFAULT 'normal',
        status varchar(30) NOT NULL DEFAULT 'draft',
        workflow_key varchar(80) NOT NULL DEFAULT 'standard-approval',
        workflow_version integer NOT NULL DEFAULT 1,
        current_step varchar(80) NOT NULL DEFAULT 'draft',
        requester_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        current_assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
        due_at timestamptz,
        submitted_at timestamptz,
        decided_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        row_version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_submissions_tenant_code" UNIQUE (tenant_id, code),
        CONSTRAINT submissions_priority_valid CHECK (priority IN ('normal', 'high', 'urgent')),
        CONSTRAINT submissions_status_valid CHECK (
          status IN ('draft', 'in_review', 'returned', 'approved', 'cancelled')
        )
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_submissions_tenant_id ON submissions(tenant_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_submissions_status ON submissions(status)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_submissions_requester_id ON submissions(requester_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_submissions_current_assignee_id ON submissions(current_assignee_id)',
    );

    await queryRunner.query(`
      CREATE TABLE submission_actions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        action varchar(40) NOT NULL,
        from_status varchar(30),
        to_status varchar(30) NOT NULL,
        note text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_submission_actions_tenant_id ON submission_actions(tenant_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_submission_actions_submission_id ON submission_actions(submission_id)',
    );

    await queryRunner.query(`
      CREATE TABLE signature_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        requested_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        provider varchar(60) NOT NULL DEFAULT 'unconfigured',
        signing_mode varchar(40) NOT NULL DEFAULT 'remote',
        status varchar(30) NOT NULL DEFAULT 'pending',
        external_reference varchar(200),
        completed_at timestamptz,
        failure_reason text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_signature_requests_submission" UNIQUE (submission_id),
        CONSTRAINT signature_requests_status_valid CHECK (
          status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
        )
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_signature_requests_tenant_id ON signature_requests(tenant_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_signature_requests_status ON signature_requests(status)',
    );

    for (const table of [
      'roles',
      'sites',
      'tenant_memberships',
      'submissions',
      'submission_actions',
      'signature_requests',
    ]) {
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

    await queryRunner.query('DROP TABLE user_roles');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_roles (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        PRIMARY KEY (user_id, role_id)
      )
    `);
    await queryRunner.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT membership.user_id, membership_role.role_id
      FROM membership_roles membership_role
      JOIN tenant_memberships membership
        ON membership.id = membership_role.membership_id
      WHERE membership.is_default = true
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query('DROP TABLE signature_requests');
    await queryRunner.query('DROP TABLE submission_actions');
    await queryRunner.query('DROP TABLE submissions');
    await queryRunner.query('ALTER TABLE audit_logs DROP COLUMN tenant_id');
    await queryRunner.query(
      'ALTER TABLE auth_sessions DROP COLUMN membership_id',
    );
    await queryRunner.query('ALTER TABLE auth_sessions DROP COLUMN tenant_id');
    await queryRunner.query('DROP TABLE membership_roles');
    await queryRunner.query('DROP TABLE tenant_memberships');
    await queryRunner.query('DROP TABLE sites');

    await queryRunner.query(`
      DELETE FROM roles
      WHERE tenant_id <> (SELECT id FROM tenants WHERE slug = 'dakrosa')
    `);
    await queryRunner.query(
      'ALTER TABLE roles DROP CONSTRAINT "UQ_roles_tenant_code"',
    );
    await queryRunner.query('ALTER TABLE roles DROP COLUMN tenant_id');
    await queryRunner.query(
      'ALTER TABLE roles ADD CONSTRAINT roles_code_key UNIQUE (code)',
    );
    await queryRunner.query('DROP TABLE tenants');
  }
}
