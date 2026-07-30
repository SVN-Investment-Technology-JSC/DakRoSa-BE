import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIdToCMMS1795550000000 implements MigrationInterface {
  name = 'AddTenantIdToCMMS1795550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sites" DROP CONSTRAINT IF EXISTS "sites_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_units" DROP CONSTRAINT IF EXISTS "organization_units_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_units" DROP CONSTRAINT IF EXISTS "organization_units_parent_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" DROP CONSTRAINT IF EXISTS "positions_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" DROP CONSTRAINT IF EXISTS "positions_organization_unit_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" DROP CONSTRAINT IF EXISTS "tenant_memberships_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" DROP CONSTRAINT IF EXISTS "tenant_memberships_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" DROP CONSTRAINT IF EXISTS "tenant_memberships_organization_unit_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" DROP CONSTRAINT IF EXISTS "tenant_memberships_position_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT IF EXISTS "auth_sessions_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT IF EXISTS "auth_sessions_membership_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" DROP CONSTRAINT IF EXISTS "submission_actions_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" DROP CONSTRAINT IF EXISTS "submission_actions_submission_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" DROP CONSTRAINT IF EXISTS "submission_actions_actor_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT IF EXISTS "submissions_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT IF EXISTS "submissions_requester_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT IF EXISTS "submissions_current_assignee_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" DROP CONSTRAINT IF EXISTS "signature_requests_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" DROP CONSTRAINT IF EXISTS "signature_requests_submission_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" DROP CONSTRAINT IF EXISTS "signature_requests_requested_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership_roles" DROP CONSTRAINT IF EXISTS "membership_roles_membership_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership_roles" DROP CONSTRAINT IF EXISTS "membership_roles_role_id_fkey"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_audit_logs_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_sites_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tenants_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_roles_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_organization_units_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_organization_units_parent_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_positions_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_positions_organization_unit_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tenant_memberships_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tenant_memberships_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tenant_memberships_organization_unit_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tenant_memberships_position_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_auth_sessions_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_auth_sessions_membership_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_submission_actions_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_submission_actions_submission_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_submissions_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_submissions_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_submissions_requester_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_submissions_current_assignee_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_signature_requests_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_signature_requests_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "tenants_slug_format"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" DROP CONSTRAINT "tenant_memberships_data_scope_valid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "submissions_priority_valid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "submissions_status_valid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" DROP CONSTRAINT "signature_requests_status_valid"`,
    );
    const defaultTenantResult = (await queryRunner.query(
      `SELECT id FROM tenants WHERE slug = 'dakrosa' LIMIT 1`,
    )) as Array<{ id: string }>;
    const defaultTenantId =
      defaultTenantResult.length > 0 ? defaultTenantResult[0].id : null;

    const tables = [
      'equipments',
      'warehouses',
      'materials',
      'material_inventory',
      'inventory_transactions',
      'work_orders',
      'work_order_logs',
      'maintenance_plans',
    ];

    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD "tenant_id" uuid`);
      if (defaultTenantId) {
        await queryRunner.query(
          `UPDATE "${table}" SET "tenant_id" = '${defaultTenantId}' WHERE "tenant_id" IS NULL`,
        );
        await queryRunner.query(
          `ALTER TABLE "${table}" ALTER COLUMN "tenant_id" SET NOT NULL`,
        );
      }
    }
    await queryRunner.query(
      `ALTER TABLE "sites" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ALTER COLUMN "enabled_modules" SET DEFAULT '["core","administration","e-office","digital-signature","organization"]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ALTER COLUMN "settings" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_units" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "row_version" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6f18d459490bb48923b1f40bdb" ON "audit_logs" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bee73a348dcf70a5e113e865bb" ON "sites" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c59559e7872bc9726adef4669f" ON "tenants" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e59a01f4fe46ebbece575d9a0f" ON "roles" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eda1a826c9757b0b9a336706c7" ON "organization_units" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a35f727a1be9892d19f6536ff7" ON "organization_units" ("parent_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_998367a410208badb017f64e71" ON "positions" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_839eadb4d6ee4880d7d596760f" ON "positions" ("organization_unit_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d22937ebccd641b5090849e51f" ON "tenant_memberships" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7427b391abdef33b40124c1582" ON "tenant_memberships" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_648a114202e15a364ab22b9288" ON "tenant_memberships" ("organization_unit_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9e32b82b28c15d669c1d184b6b" ON "tenant_memberships" ("position_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5dc49263cfc54258d6fa928287" ON "auth_sessions" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7f756ac9b439831b3e0f365bc6" ON "auth_sessions" ("membership_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5829b9cd52dcbb6b829ddc2df8" ON "submission_actions" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bc3b982202bb904812a19f71fc" ON "submission_actions" ("submission_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d3d5aa4f93a2332f3197818559" ON "submissions" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d4842916487f15fcca89b1a918" ON "submissions" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2fc7613bcf5b00acb7e2c781a8" ON "submissions" ("requester_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e073c281357b8649fddfe70a8e" ON "submissions" ("current_assignee_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e0eb3357f2e6211c42a0de69ce" ON "signature_requests" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b573a2dda0505dd355c23afde5" ON "signature_requests" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cee7bc65abd4c38c856f1361fd" ON "membership_roles" ("membership_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c625b47ba8734dafec257d918f" ON "membership_roles" ("role_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sites" ADD CONSTRAINT "FK_bee73a348dcf70a5e113e865bb4" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD CONSTRAINT "FK_e59a01f4fe46ebbece575d9a0fc" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_units" ADD CONSTRAINT "FK_eda1a826c9757b0b9a336706c76" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_units" ADD CONSTRAINT "FK_a35f727a1be9892d19f6536ff7a" FOREIGN KEY ("parent_id") REFERENCES "organization_units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ADD CONSTRAINT "FK_998367a410208badb017f64e716" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ADD CONSTRAINT "FK_839eadb4d6ee4880d7d596760fa" FOREIGN KEY ("organization_unit_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" ADD CONSTRAINT "FK_d22937ebccd641b5090849e51f7" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" ADD CONSTRAINT "FK_7427b391abdef33b40124c15822" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" ADD CONSTRAINT "FK_648a114202e15a364ab22b9288d" FOREIGN KEY ("organization_unit_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" ADD CONSTRAINT "FK_9e32b82b28c15d669c1d184b6b8" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_5dc49263cfc54258d6fa9282873" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_7f756ac9b439831b3e0f365bc6b" FOREIGN KEY ("membership_id") REFERENCES "tenant_memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" ADD CONSTRAINT "FK_bc3b982202bb904812a19f71fcc" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" ADD CONSTRAINT "FK_cd7d50284be80269fed3accd171" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_2fc7613bcf5b00acb7e2c781a89" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_e073c281357b8649fddfe70a8e9" FOREIGN KEY ("current_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" ADD CONSTRAINT "FK_b1892841b2d7fa4b204562366e7" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" ADD CONSTRAINT "FK_8b61d70d4c1086ceea484bb9965" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "equipments" ADD CONSTRAINT "FK_5760cbdab1bc575462811342ff6" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouses" ADD CONSTRAINT "FK_09106b8068aeaf74fa33666df8f" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" ADD CONSTRAINT "FK_fbcca407c4c69cab97df4787481" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "material_inventory" ADD CONSTRAINT "FK_03e91df466c43bcdf8525f440cf" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_d84016219a197827a82e178881c" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD CONSTRAINT "FK_0059be3d968bef25dcf779f043e" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_logs" ADD CONSTRAINT "FK_1edaac96d845018728d068a7118" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_plans" ADD CONSTRAINT "FK_a3776f3f1a84f5e6d8df20f1209" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership_roles" ADD CONSTRAINT "FK_cee7bc65abd4c38c856f1361fd6" FOREIGN KEY ("membership_id") REFERENCES "tenant_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership_roles" ADD CONSTRAINT "FK_c625b47ba8734dafec257d918f7" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "membership_roles" DROP CONSTRAINT "FK_c625b47ba8734dafec257d918f7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership_roles" DROP CONSTRAINT "FK_cee7bc65abd4c38c856f1361fd6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_plans" DROP CONSTRAINT "FK_a3776f3f1a84f5e6d8df20f1209"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_logs" DROP CONSTRAINT "FK_1edaac96d845018728d068a7118"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP CONSTRAINT "FK_0059be3d968bef25dcf779f043e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_d84016219a197827a82e178881c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "material_inventory" DROP CONSTRAINT "FK_03e91df466c43bcdf8525f440cf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" DROP CONSTRAINT "FK_fbcca407c4c69cab97df4787481"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouses" DROP CONSTRAINT "FK_09106b8068aeaf74fa33666df8f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "equipments" DROP CONSTRAINT "FK_5760cbdab1bc575462811342ff6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" DROP CONSTRAINT "FK_8b61d70d4c1086ceea484bb9965"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" DROP CONSTRAINT "FK_b1892841b2d7fa4b204562366e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_e073c281357b8649fddfe70a8e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_2fc7613bcf5b00acb7e2c781a89"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" DROP CONSTRAINT "FK_cd7d50284be80269fed3accd171"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" DROP CONSTRAINT "FK_bc3b982202bb904812a19f71fcc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_7f756ac9b439831b3e0f365bc6b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_5dc49263cfc54258d6fa9282873"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" DROP CONSTRAINT "FK_9e32b82b28c15d669c1d184b6b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" DROP CONSTRAINT "FK_648a114202e15a364ab22b9288d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" DROP CONSTRAINT "FK_7427b391abdef33b40124c15822"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" DROP CONSTRAINT "FK_d22937ebccd641b5090849e51f7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" DROP CONSTRAINT "FK_839eadb4d6ee4880d7d596760fa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" DROP CONSTRAINT "FK_998367a410208badb017f64e716"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_units" DROP CONSTRAINT "FK_a35f727a1be9892d19f6536ff7a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_units" DROP CONSTRAINT "FK_eda1a826c9757b0b9a336706c76"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" DROP CONSTRAINT "FK_e59a01f4fe46ebbece575d9a0fc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sites" DROP CONSTRAINT "FK_bee73a348dcf70a5e113e865bb4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c625b47ba8734dafec257d918f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cee7bc65abd4c38c856f1361fd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b573a2dda0505dd355c23afde5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e0eb3357f2e6211c42a0de69ce"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e073c281357b8649fddfe70a8e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2fc7613bcf5b00acb7e2c781a8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d4842916487f15fcca89b1a918"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d3d5aa4f93a2332f3197818559"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bc3b982202bb904812a19f71fc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5829b9cd52dcbb6b829ddc2df8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7f756ac9b439831b3e0f365bc6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5dc49263cfc54258d6fa928287"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9e32b82b28c15d669c1d184b6b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_648a114202e15a364ab22b9288"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7427b391abdef33b40124c1582"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d22937ebccd641b5090849e51f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_839eadb4d6ee4880d7d596760f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_998367a410208badb017f64e71"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a35f727a1be9892d19f6536ff7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eda1a826c9757b0b9a336706c7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e59a01f4fe46ebbece575d9a0f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c59559e7872bc9726adef4669f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bee73a348dcf70a5e113e865bb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6f18d459490bb48923b1f40bdb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "row_version" SET DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_units" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ALTER COLUMN "settings" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ALTER COLUMN "enabled_modules" SET DEFAULT '["core", "administration", "e-office", "digital-signature", "organization"]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sites" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_plans" DROP COLUMN "tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_logs" DROP COLUMN "tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP COLUMN "tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP COLUMN "tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "material_inventory" DROP COLUMN "tenant_id"`,
    );
    await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "tenant_id"`);
    await queryRunner.query(`ALTER TABLE "warehouses" DROP COLUMN "tenant_id"`);
    await queryRunner.query(`ALTER TABLE "equipments" DROP COLUMN "tenant_id"`);
    await queryRunner.query(
      `ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_status_valid" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "submissions_status_valid" CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'in_review'::character varying, 'returned'::character varying, 'approved'::character varying, 'cancelled'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "submissions_priority_valid" CHECK (((priority)::text = ANY ((ARRAY['normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_data_scope_valid" CHECK (((data_scope)::text = ANY ((ARRAY['tenant'::character varying, 'organization_unit'::character varying, 'site'::character varying, 'own'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "tenants_slug_format" CHECK (((slug)::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_signature_requests_status" ON "signature_requests" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_signature_requests_tenant_id" ON "signature_requests" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_submissions_current_assignee_id" ON "submissions" ("current_assignee_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_submissions_requester_id" ON "submissions" ("requester_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_submissions_status" ON "submissions" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_submissions_tenant_id" ON "submissions" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_submission_actions_submission_id" ON "submission_actions" ("submission_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_submission_actions_tenant_id" ON "submission_actions" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_sessions_membership_id" ON "auth_sessions" ("membership_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_sessions_tenant_id" ON "auth_sessions" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tenant_memberships_position_id" ON "tenant_memberships" ("position_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tenant_memberships_organization_unit_id" ON "tenant_memberships" ("organization_unit_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tenant_memberships_user_id" ON "tenant_memberships" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tenant_memberships_tenant_id" ON "tenant_memberships" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_positions_organization_unit_id" ON "positions" ("organization_unit_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_positions_tenant_id" ON "positions" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_organization_units_parent_id" ON "organization_units" ("parent_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_organization_units_tenant_id" ON "organization_units" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_roles_tenant_id" ON "roles" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tenants_status" ON "tenants" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sites_tenant_id" ON "sites" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_tenant_id" ON "audit_logs" ("tenant_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "tenant_memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "submissions_current_assignee_id_fkey" FOREIGN KEY ("current_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "submissions_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "submissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" ADD CONSTRAINT "submission_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" ADD CONSTRAINT "submission_actions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submission_actions" ADD CONSTRAINT "submission_actions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "tenant_memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_organization_unit_id_fkey" FOREIGN KEY ("organization_unit_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ADD CONSTRAINT "positions_organization_unit_id_fkey" FOREIGN KEY ("organization_unit_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ADD CONSTRAINT "positions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "organization_units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
