import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePlatformAdminTenantRoles1795800000000
  implements MigrationInterface
{
  name = 'RemovePlatformAdminTenantRoles1795800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "membership_roles" AS membership_role
      USING "tenant_memberships" AS membership, "users" AS account, "roles" AS role
      WHERE membership_role."membership_id" = membership."id"
        AND membership."user_id" = account."id"
        AND membership_role."role_id" = role."id"
        AND account."is_platform_admin" = true
        AND role."code" = 'admin'
    `);
  }

  public async down(): Promise<void> {
    // The former tenant-role assignment is intentionally not restored.
  }
}
