import 'reflect-metadata';
import * as argon2 from 'argon2';
import {
  PERMISSIONS,
  PERMISSION_CATALOG,
} from '../common/constants/permissions';
import AppDataSource from './data-source';
import { PermissionEntity, RoleEntity, UserEntity } from './entities';

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  const permissionRepository = AppDataSource.getRepository(PermissionEntity);
  const roleRepository = AppDataSource.getRepository(RoleEntity);
  const userRepository = AppDataSource.getRepository(UserEntity);

  for (const definition of PERMISSION_CATALOG) {
    await permissionRepository.upsert(definition, ['key']);
  }

  const permissions = await permissionRepository.find();
  let adminRole = await roleRepository.findOne({ where: { code: 'admin' } });
  adminRole ??= roleRepository.create({
    code: 'admin',
    name: 'Quản trị hệ thống',
    description: 'Vai trò hệ thống có toàn quyền.',
    isSystem: true,
    permissions,
  });
  adminRole.permissions = permissions;
  await roleRepository.save(adminRole);

  let userRole = await roleRepository.findOne({ where: { code: 'user' } });
  userRole ??= roleRepository.create({
    code: 'user',
    name: 'Người dùng',
    description: 'Vai trò cơ bản dành cho người dùng hệ thống.',
    isSystem: true,
    permissions: permissions.filter(
      (permission) => permission.key === PERMISSIONS.DASHBOARD_VIEW,
    ),
  });
  await roleRepository.save(userRole);

  const username = (process.env.ADMIN_USERNAME ?? 'admin').trim().toLowerCase();
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
      roles: [adminRole],
    });
    await userRepository.save(admin);
  } else {
    let shouldSaveAdmin = false;
    if (admin.email === 'admin@dakrosa.local') {
      admin.email = adminEmail;
      shouldSaveAdmin = true;
    }
    if (!admin.roles.some((role) => role.code === 'admin')) {
      admin.roles = [...admin.roles, adminRole];
      shouldSaveAdmin = true;
    }
    if (shouldSaveAdmin) await userRepository.save(admin);
  }

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
