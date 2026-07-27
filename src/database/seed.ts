import 'reflect-metadata';
import * as argon2 from 'argon2';
import {
  PERMISSIONS,
  PERMISSION_CATALOG,
} from '../common/constants/permissions';
import AppDataSource from './data-source';
import {
  PermissionEntity,
  RoleEntity,
  TenantEntity,
  TenantMembershipEntity,
  UserEntity,
} from './entities';

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  const permissionRepository = AppDataSource.getRepository(PermissionEntity);
  const roleRepository = AppDataSource.getRepository(RoleEntity);
  const tenantRepository = AppDataSource.getRepository(TenantEntity);
  const membershipRepository = AppDataSource.getRepository(
    TenantMembershipEntity,
  );
  const userRepository = AppDataSource.getRepository(UserEntity);

  for (const definition of PERMISSION_CATALOG) {
    await permissionRepository.upsert(definition, ['key']);
  }

  const tenantSlug = (
    process.env.DEFAULT_TENANT_SLUG ?? 'dakrosa'
  ).toLowerCase();
  const tenant = await tenantRepository.findOneBy({ slug: tenantSlug });
  if (!tenant) {
    throw new Error(
      `Tenant "${tenantSlug}" does not exist. Run database migrations first.`,
    );
  }

  const permissions = await permissionRepository.find();
  const defaultUserPermissionKeys = new Set<string>([
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.WORK_ITEMS_VIEW,
    PERMISSIONS.SUBMISSIONS_VIEW,
    PERMISSIONS.SUBMISSIONS_CREATE,
    PERMISSIONS.SUBMISSIONS_UPDATE,
    PERMISSIONS.SUBMISSIONS_SUBMIT,
    PERMISSIONS.SIGNATURES_VIEW,
  ]);
  let adminRole = await roleRepository.findOne({
    where: { tenantId: tenant.id, code: 'admin' },
  });
  adminRole ??= roleRepository.create({
    tenantId: tenant.id,
    code: 'admin',
    name: 'Quản trị doanh nghiệp',
    description: 'Vai trò quản trị toàn quyền trong phạm vi doanh nghiệp.',
    isSystem: false,
    permissions,
  });
  adminRole.isSystem = false;
  adminRole.permissions = permissions;
  await roleRepository.save(adminRole);

  let userRole = await roleRepository.findOne({
    where: { tenantId: tenant.id, code: 'user' },
  });
  userRole ??= roleRepository.create({
    tenantId: tenant.id,
    code: 'user',
    name: 'Người dùng',
    description: 'Vai trò cơ bản dành cho người dùng hệ thống.',
    isSystem: false,
    permissions: permissions.filter((permission) =>
      defaultUserPermissionKeys.has(permission.key),
    ),
  });
  // The default user role is configurable per business. Keep older seeded
  // databases aligned with this policy on every safe seed run.
  userRole.isSystem = false;
  await roleRepository.save(userRole);

  const username = (process.env.ADMIN_USERNAME ?? 'superadmin')
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'savinahub@gmail.com')
    .trim()
    .toLowerCase();
  if (!password || password.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
  }

  let admin = await userRepository.findOne({ where: { username } });
  if (!admin) {
    admin = userRepository.create({
      username,
      displayName: process.env.ADMIN_DISPLAY_NAME ?? 'Quản trị hệ thống',
      shortName: 'ADMIN',
      email: adminEmail,
      phone: process.env.ADMIN_PHONE ?? '0000000000',
      address: null,
      joinedAt: process.env.ADMIN_JOINED_AT ?? '2026-01-01',
      workShift: null,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      isActive: true,
    });
    await userRepository.save(admin);
  } else if (admin.email === 'admin@dakrosa.local') {
    admin.email = adminEmail;
    await userRepository.save(admin);
  }
  admin.isPlatformAdmin = true;
  await userRepository.save(admin);

  let membership = await membershipRepository.findOne({
    where: { tenantId: tenant.id, userId: admin.id },
    relations: { roles: true },
  });
  membership ??= membershipRepository.create({
    tenantId: tenant.id,
    userId: admin.id,
    status: 'active',
    isDefault: true,
    roles: [],
  });
  membership.status = 'active';
  membership.isDefault = true;
  if (!membership.roles.some((role) => role.id === adminRole.id)) {
    membership.roles = [...membership.roles, adminRole];
  }
  await membershipRepository.save(membership);

  // Never print credentials or token material. This line only confirms completion.
  process.stdout.write('Database seed completed.\n');
  await AppDataSource.destroy();
}

void seed().catch(async (error: unknown) => {
  process.stderr.write(
    `Database seed failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
  );
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exitCode = 1;
});
