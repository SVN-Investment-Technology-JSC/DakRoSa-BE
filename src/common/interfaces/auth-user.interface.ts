export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  sessionId: string;
  tokenId: string;
  roleCodes: string[];
  permissions: string[];
}
