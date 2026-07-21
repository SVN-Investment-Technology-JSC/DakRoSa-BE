export interface JwtPayload {
  sub: string;
  username: string;
  sid: string;
  jti: string;
  iat?: number;
  exp?: number;
}
