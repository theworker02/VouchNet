import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { createSqlClient } from '@nexus/db';

const availableScopes = ['profile:read', 'profile:email', 'resume:read', 'skills:verify'] as const;
export type ApplyScope = (typeof availableScopes)[number];
const authorizationCodeLifetimeMs = 5 * 60 * 1000;
const accessTokenLifetimeMs = 60 * 60 * 1000;

type Client = {
  id: string;
  clientId: string;
  name: string;
  redirectUris: string[];
  allowedScopes: ApplyScope[];
  revokedAt: Date | null;
};

export class ApplyOAuthError extends Error {
  constructor(
    readonly code:
      | 'INVALID_CLIENT'
      | 'INVALID_REDIRECT_URI'
      | 'INVALID_SCOPE'
      | 'INVALID_REQUEST'
      | 'INVALID_GRANT'
      | 'INVALID_TOKEN'
      | 'CLIENT_REVOKED',
  ) {
    super(code);
  }
}

function database() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

function signingSecret(): string {
  const secret = process.env.VOUCHNET_OAUTH_SIGNING_KEY;
  if (secret === undefined || secret.length < 32) throw new Error('OAUTH_SERVER_UNAVAILABLE');
  return secret;
}

function opaqueHash(value: string): string {
  return createHmac('sha256', signingSecret()).update(value).digest('hex');
}

function parseScopes(value: string | null): ApplyScope[] {
  const scopes = (value ?? 'profile:read').split(/\s+/).filter(Boolean);
  if (scopes.length === 0 || scopes.some((scope) => !availableScopes.includes(scope as ApplyScope)))
    throw new ApplyOAuthError('INVALID_SCOPE');
  return [...new Set(scopes)] as ApplyScope[];
}

export function validateRedirectUri(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApplyOAuthError('INVALID_REDIRECT_URI');
  }
  const localDevelopment =
    url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (
    (!localDevelopment && url.protocol !== 'https:') ||
    url.hash.length > 0 ||
    url.username ||
    url.password
  )
    throw new ApplyOAuthError('INVALID_REDIRECT_URI');
  return url.toString();
}

function parseClient(row: {
  id: string;
  client_id: string;
  name: string;
  redirect_uris: unknown;
  allowed_scopes: unknown;
  revoked_at: Date | null;
}): Client {
  const redirectUris = Array.isArray(row.redirect_uris)
    ? row.redirect_uris.filter((uri): uri is string => typeof uri === 'string')
    : [];
  const allowedScopes = Array.isArray(row.allowed_scopes)
    ? row.allowed_scopes.filter((scope): scope is ApplyScope =>
        availableScopes.includes(scope as ApplyScope),
      )
    : [];
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    redirectUris,
    allowedScopes,
    revokedAt: row.revoked_at,
  };
}

async function findClient(clientId: string): Promise<Client> {
  const sql = database();
  try {
    const rows = await sql<
      {
        id: string;
        client_id: string;
        name: string;
        redirect_uris: unknown;
        allowed_scopes: unknown;
        revoked_at: Date | null;
      }[]
    >`SELECT id,client_id,name,redirect_uris,allowed_scopes,revoked_at FROM developer_clients WHERE client_id=${clientId}`;
    const row = rows[0];
    if (row === undefined) throw new ApplyOAuthError('INVALID_CLIENT');
    const client = parseClient(row);
    if (client.revokedAt !== null) throw new ApplyOAuthError('CLIENT_REVOKED');
    return client;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function createDeveloperClient(input: {
  ownerId: string;
  name: string;
  redirectUris: string[];
  scopes: ApplyScope[];
}) {
  const clientId = `vn_${randomBytes(16).toString('base64url')}`;
  const clientSecret = `vns_${randomBytes(32).toString('base64url')}`;
  const sql = database();
  try {
    const created = await sql<{ id: string }[]>`
      INSERT INTO developer_clients (owner_id,client_id,client_secret_hash,name,redirect_uris,allowed_scopes)
      VALUES (${input.ownerId},${clientId},${opaqueHash(clientSecret)},${input.name},${JSON.stringify(input.redirectUris)}::jsonb,${JSON.stringify(input.scopes)}::jsonb)
      RETURNING id
    `;
    if (created[0] === undefined) throw new Error('CLIENT_CREATE_FAILED');
    await sql`
      INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision)
      VALUES ('HUMAN',${input.ownerId},${input.ownerId},'DEVELOPER_CLIENT_CREATED','DEVELOPER_CLIENT',${created[0].id},${randomUUID()},'SUCCESS','OWNER_AUTHORIZED')
    `;
    return { clientId, clientSecret };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function listDeveloperClients(ownerId: string) {
  const sql = database();
  try {
    return await sql<
      {
        id: string;
        client_id: string;
        name: string;
        redirect_uris: unknown;
        created_at: Date;
        revoked_at: Date | null;
      }[]
    >`
      SELECT id,client_id,name,redirect_uris,created_at,revoked_at
      FROM developer_clients WHERE owner_id=${ownerId} ORDER BY created_at DESC
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function revokeDeveloperClient(ownerId: string, clientId: string): Promise<boolean> {
  const sql = database();
  try {
    return await sql.begin(async (transaction) => {
      const rows = await transaction<{ id: string }[]>`
        UPDATE developer_clients SET revoked_at=now(),updated_at=now()
        WHERE id=${clientId} AND owner_id=${ownerId} AND revoked_at IS NULL RETURNING id
      `;
      if (rows[0] === undefined) return false;
      await transaction`UPDATE oauth_access_tokens SET revoked_at=now() WHERE client_id=${clientId} AND revoked_at IS NULL`;
      await transaction`
        INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision)
        VALUES ('HUMAN',${ownerId},${ownerId},'DEVELOPER_CLIENT_REVOKED','DEVELOPER_CLIENT',${clientId},${randomUUID()},'SUCCESS','OWNER_AUTHORIZED')
      `;
      return true;
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function resolveAuthorization(input: {
  clientId: string;
  redirectUri: string;
  scope: string | null;
  state: string | null;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
}) {
  if (input.codeChallenge === null || input.codeChallengeMethod !== 'S256')
    throw new ApplyOAuthError('INVALID_REQUEST');
  const client = await findClient(input.clientId);
  const redirectUri = validateRedirectUri(input.redirectUri);
  if (!client.redirectUris.includes(redirectUri)) throw new ApplyOAuthError('INVALID_REDIRECT_URI');
  const scopes = parseScopes(input.scope);
  if (scopes.some((scope) => !client.allowedScopes.includes(scope)))
    throw new ApplyOAuthError('INVALID_SCOPE');
  if (input.state !== null && input.state.length > 512)
    throw new ApplyOAuthError('INVALID_REQUEST');
  return { client, redirectUri, scopes, state: input.state, codeChallenge: input.codeChallenge };
}

export async function issueAuthorizationCode(input: {
  userId: string;
  clientId: string;
  redirectUri: string;
  scopes: ApplyScope[];
  codeChallenge: string;
}) {
  const code = `vnc_${randomBytes(32).toString('base64url')}`;
  const sql = database();
  try {
    await sql.begin(async (transaction) => {
      const client = await transaction<{ id: string }[]>`
        SELECT id FROM developer_clients WHERE client_id=${input.clientId} AND revoked_at IS NULL FOR UPDATE
      `;
      if (client[0] === undefined) throw new ApplyOAuthError('INVALID_CLIENT');
      await transaction`
        INSERT INTO oauth_authorization_codes (client_id,user_id,code_hash,redirect_uri,scopes,code_challenge,expires_at)
        VALUES (${client[0].id},${input.userId},${opaqueHash(code)},${input.redirectUri},${JSON.stringify(input.scopes)}::jsonb,${input.codeChallenge},${new Date(Date.now() + authorizationCodeLifetimeMs)})
      `;
      await transaction`
        INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision)
        VALUES ('HUMAN',${input.userId},${input.userId},'APPLY_WITH_VOUCHNET_APPROVED','OAUTH_CLIENT',${client[0].id},${randomUUID()},'SUCCESS','EXPLICIT_MEMBER_CONSENT')
      `;
    });
    return code;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

function validClientSecret(provided: string, storedHash: string): boolean {
  const actual = Buffer.from(opaqueHash(provided));
  const expected = Buffer.from(storedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function exchangeAuthorizationCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const sql = database();
  const redirectUri = validateRedirectUri(input.redirectUri);
  try {
    return await sql.begin(async (transaction) => {
      const rows = await transaction<
        {
          id: string;
          user_id: string;
          redirect_uri: string;
          scopes: unknown;
          code_challenge: string;
          client_secret_hash: string;
          client_id: string;
          revoked_at: Date | null;
        }[]
      >`
        SELECT code.id,code.user_id,code.redirect_uri,code.scopes,code.code_challenge,client.client_secret_hash,client.client_id,client.revoked_at
        FROM oauth_authorization_codes code JOIN developer_clients client ON client.id=code.client_id
        WHERE code.code_hash=${opaqueHash(input.code)} AND code.used_at IS NULL AND code.expires_at>now() FOR UPDATE
      `;
      const grant = rows[0];
      if (
        grant === undefined ||
        grant.client_id !== input.clientId ||
        grant.revoked_at !== null ||
        grant.redirect_uri !== redirectUri ||
        !validClientSecret(input.clientSecret, grant.client_secret_hash)
      )
        throw new ApplyOAuthError('INVALID_GRANT');
      const expectedChallenge = createHash('sha256').update(input.codeVerifier).digest('base64url');
      if (!timingSafeEqual(Buffer.from(expectedChallenge), Buffer.from(grant.code_challenge)))
        throw new ApplyOAuthError('INVALID_GRANT');
      const token = `vnat_${randomBytes(32).toString('base64url')}`;
      await transaction`UPDATE oauth_authorization_codes SET used_at=now() WHERE id=${grant.id}`;
      await transaction`
        INSERT INTO oauth_access_tokens (client_id,user_id,token_hash,scopes,expires_at)
        SELECT client_id,user_id,${opaqueHash(token)},scopes,${new Date(Date.now() + accessTokenLifetimeMs)}
        FROM oauth_authorization_codes WHERE id=${grant.id}
      `;
      return {
        accessToken: token,
        scopes: Array.isArray(grant.scopes)
          ? grant.scopes.filter((scope): scope is ApplyScope => typeof scope === 'string')
          : [],
        expiresIn: accessTokenLifetimeMs / 1000,
      };
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function profileForAccessToken(token: string) {
  const sql = database();
  try {
    const rows = await sql<
      {
        token_id: string;
        scopes: unknown;
        user_id: string;
        slug: string;
        first_name: string;
        last_name: string;
        headline: string | null;
        email_normalized: string;
      }[]
    >`
      SELECT token.id AS token_id,token.scopes,token.user_id,p.slug,p.first_name,p.last_name,p.headline,e.email_normalized
      FROM oauth_access_tokens token
      JOIN developer_clients client ON client.id=token.client_id AND client.revoked_at IS NULL
      JOIN profiles p ON p.user_id=token.user_id
      JOIN user_emails e ON e.user_id=token.user_id AND e.is_primary=true AND e.verified_at IS NOT NULL
      WHERE token.token_hash=${opaqueHash(token)} AND token.revoked_at IS NULL AND token.expires_at>now()
    `;
    const record = rows[0];
    if (record === undefined) throw new ApplyOAuthError('INVALID_TOKEN');
    const scopes = Array.isArray(record.scopes)
      ? record.scopes.filter((scope): scope is ApplyScope => typeof scope === 'string')
      : [];
    if (!scopes.includes('profile:read')) throw new ApplyOAuthError('INVALID_TOKEN');
    await sql`UPDATE oauth_access_tokens SET last_used_at=now() WHERE id=${record.token_id}`;
    return {
      sub: record.user_id,
      profile_url: `${process.env.APP_URL ?? 'http://localhost:3002'}/vouch/${record.slug}`,
      name: `${record.first_name} ${record.last_name}`,
      given_name: record.first_name,
      family_name: record.last_name,
      headline: record.headline,
      ...(scopes.includes('profile:email') ? { email: record.email_normalized } : {}),
    };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export function hasValidPkceVerifier(value: string): boolean {
  return value.length >= 43 && value.length <= 128 && /^[A-Za-z0-9\-._~]+$/.test(value);
}
