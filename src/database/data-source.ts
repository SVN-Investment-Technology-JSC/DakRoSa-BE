import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';
import {
  AuditLogEntity,
  AuthSessionEntity,
  PermissionEntity,
  RoleEntity,
  UserEntity,
} from './entities';

const nodeEnv = process.env.NODE_ENV ?? 'development';
loadEnv({ path: `.env.${nodeEnv}` });
loadEnv();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  database: process.env.DATABASE_NAME,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl:
    process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
  entities: [
    AuditLogEntity,
    AuthSessionEntity,
    PermissionEntity,
    RoleEntity,
    UserEntity,
  ],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});

export default AppDataSource;
