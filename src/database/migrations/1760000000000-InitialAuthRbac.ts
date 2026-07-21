import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAuthRbac1760000000000 implements MigrationInterface {
  name = 'InitialAuthRbac1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query(`
      CREATE TABLE permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key varchar(100) NOT NULL UNIQUE,
        name varchar(150) NOT NULL,
        "group" varchar(80) NOT NULL,
        description text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(60) NOT NULL UNIQUE,
        name varchar(120) NOT NULL,
        description text,
        is_system boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username varchar(80) NOT NULL UNIQUE,
        display_name varchar(150) NOT NULL,
        password_hash varchar(255) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        last_login_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT users_username_lowercase CHECK (username = lower(username))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE role_permissions (
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE user_roles (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        PRIMARY KEY (user_id, role_id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE auth_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash varchar(64) NOT NULL UNIQUE,
        user_agent text,
        ip_address inet,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at)',
    );
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id uuid,
        username varchar(80),
        action varchar(80) NOT NULL,
        resource varchar(80) NOT NULL,
        resource_id varchar(100),
        status varchar(30) NOT NULL DEFAULT 'success',
        ip_address inet,
        details jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS audit_logs');
    await queryRunner.query('DROP TABLE IF EXISTS auth_sessions');
    await queryRunner.query('DROP TABLE IF EXISTS user_roles');
    await queryRunner.query('DROP TABLE IF EXISTS role_permissions');
    await queryRunner.query('DROP TABLE IF EXISTS users');
    await queryRunner.query('DROP TABLE IF EXISTS roles');
    await queryRunner.query('DROP TABLE IF EXISTS permissions');
  }
}
