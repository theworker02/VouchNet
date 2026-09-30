export const mcpScopes = [
  'profile:read',
  'profile:draft',
  'feed:read',
  'posts:read',
  'posts:draft',
  'messages:read',
  'messages:draft',
  'jobs:read',
  'jobs:draft',
  'notifications:read',
  'analytics:read',
] as const;
export type McpScope = (typeof mcpScopes)[number];
export interface McpCredentialRecord {
  id: string;
  clientId: string;
  userId: string;
  scopes: McpScope[];
  secretHash: string;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}
export function canUseCredential(credential: McpCredentialRecord, scope: McpScope): boolean {
  return credential.revokedAt === null && credential.scopes.includes(scope);
}
