import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(8080),
  APP_ORIGIN: Joi.string().required(),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  REDIS_URL: Joi.string().uri().required(),
  MINIO_ENDPOINT: Joi.string().required(),
  MINIO_PORT: Joi.number().port().default(9000),
  MINIO_USE_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  MINIO_ACCESS_KEY: Joi.string().required(),
  MINIO_SECRET_KEY: Joi.string().required(),
  MINIO_BUCKET: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  REFRESH_TOKEN_DAYS: Joi.number().integer().min(1).max(90).default(7),
  COOKIE_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
  ADMIN_USERNAME: Joi.string().min(3).default('admin'),
  ADMIN_PASSWORD: Joi.string().min(12).required(),
  ADMIN_DISPLAY_NAME: Joi.string().default('Quản trị hệ thống'),
  ADMIN_EMAIL: Joi.string().email().default('admin@dakrosa.local'),
  ADMIN_PHONE: Joi.string().min(7).max(30).default('0000000000'),
  ADMIN_JOINED_AT: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .default('2026-01-01'),
});
