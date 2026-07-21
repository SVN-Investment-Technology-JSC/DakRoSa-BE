import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_ACCESS_SECRET,
  jwtTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS ?? 7),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
}));
