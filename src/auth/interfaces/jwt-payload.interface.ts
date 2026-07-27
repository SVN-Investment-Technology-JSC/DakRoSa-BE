export interface JwtPayload {
  sub: string;
  username: string;
  sid: string;
  jti: string;
  tid: string;
  mid: string;
  iat?: number;
  exp?: number;
}
