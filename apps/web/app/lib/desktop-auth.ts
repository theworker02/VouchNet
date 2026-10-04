import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';
import { createSecretToken, hashOpaqueToken } from '@nexus/auth';
import { createSqlClient } from '@nexus/db';

const accessLifetimeMs = 60 * 60 * 1000;
const refreshLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const authorizationCodeLifetimeMs = 5 * 60 * 1000;

function sql() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

export type DesktopAuthorizationRequest = { state: string; codeChallenge: string };

export function validateDesktopAuthorization(input: {
  state: string | null;
  codeChallenge: string | null;
}): DesktopAuthorizationRequest | null {
  const state = input.state?.trim();
  const codeChallenge = input.codeChallenge?.trim();
  if (
    state === undefined ||
    codeChallenge === undefined ||
    !/^[A-Za-z0-9._~-]{16,512}$/.test(state) ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)
  )
    return null;
  return { state, codeChallenge };
}

function pkceChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

function safelyEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function approveDesktopAuthorization(
  userId: string,
  request: DesktopAuthorizationRequest,
) {
  const client = sql();
  const code = createSecretToken(authorizationCodeLifetimeMs);
  try {
    await client`
      INSERT INTO desktop_authorization_codes (code_hash,user_id,code_challenge,state,expires_at)
      VALUES (${code.tokenHash},${userId},${request.codeChallenge},${request.state},${code.expiresAt})
    `;
    return code.token;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function exchangeDesktopAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
}) {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const rows = await transaction<{ id: string; user_id: string; code_challenge: string }[]>`
        UPDATE desktop_authorization_codes SET used_at=now()
        WHERE code_hash=${hashOpaqueToken(input.code)} AND used_at IS NULL AND expires_at>now()
        RETURNING id,user_id,code_challenge
      `;
      const authorization = rows[0];
      if (
        authorization === undefined ||
        !safelyEqual(pkceChallenge(input.codeVerifier), authorization.code_challenge)
      )
        throw new Error('DESKTOP_CODE_INVALID');
      const families = await transaction<{ id: string }[]>`
        INSERT INTO desktop_token_families (user_id) VALUES (${authorization.user_id}) RETURNING id
      `;
      const family = families[0];
      if (family === undefined) throw new Error('DESKTOP_FAMILY_CREATE_FAILED');
      const access = createSecretToken(accessLifetimeMs);
      const refresh = createSecretToken(refreshLifetimeMs);
      const refreshRows = await transaction<{ id: string }[]>`
        INSERT INTO desktop_refresh_tokens (token_hash,family_id,user_id,expires_at)
        VALUES (${refresh.tokenHash},${family.id},${authorization.user_id},${refresh.expiresAt}) RETURNING id
      `;
      if (refreshRows[0] === undefined) throw new Error('DESKTOP_REFRESH_CREATE_FAILED');
      await transaction`
        INSERT INTO desktop_access_tokens (token_hash,user_id,family_id,expires_at)
        VALUES (${access.tokenHash},${authorization.user_id},${family.id},${access.expiresAt})
      `;
      return {
        accessToken: access.token,
        refreshToken: refresh.token,
        expiresIn: Math.floor(accessLifetimeMs / 1000),
        userId: authorization.user_id,
      };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function rotateDesktopRefreshToken(token: string) {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const rows = await transaction<
        {
          id: string;
          user_id: string;
          family_id: string;
          used_at: Date | null;
          revoked_at: Date | null;
          expires_at: Date;
          family_revoked_at: Date | null;
        }[]
      >`
        SELECT rt.id,rt.user_id,rt.family_id,rt.used_at,rt.revoked_at,rt.expires_at,f.revoked_at AS family_revoked_at
        FROM desktop_refresh_tokens rt JOIN desktop_token_families f ON f.id=rt.family_id
        WHERE rt.token_hash=${hashOpaqueToken(token)} FOR UPDATE
      `;
      const previous = rows[0];
      if (previous === undefined) throw new Error('DESKTOP_REFRESH_INVALID');
      if (
        previous.used_at !== null ||
        previous.revoked_at !== null ||
        previous.family_revoked_at !== null ||
        previous.expires_at <= new Date()
      ) {
        // A refresh token replay invalidates its entire device family, including already-issued access tokens.
        await transaction`UPDATE desktop_token_families SET revoked_at=COALESCE(revoked_at,now()) WHERE id=${previous.family_id}`;
        await transaction`UPDATE desktop_access_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE family_id=${previous.family_id}`;
        throw new Error('DESKTOP_REFRESH_REPLAY');
      }
      const access = createSecretToken(accessLifetimeMs);
      const refresh = createSecretToken(refreshLifetimeMs);
      const replacement = await transaction<{ id: string }[]>`
        INSERT INTO desktop_refresh_tokens (token_hash,family_id,user_id,expires_at)
        VALUES (${refresh.tokenHash},${previous.family_id},${previous.user_id},${refresh.expiresAt}) RETURNING id
      `;
      if (replacement[0] === undefined) throw new Error('DESKTOP_REFRESH_CREATE_FAILED');
      await transaction`INSERT INTO desktop_access_tokens (token_hash,user_id,family_id,expires_at) VALUES (${access.tokenHash},${previous.user_id},${previous.family_id},${access.expiresAt})`;
      await transaction`UPDATE desktop_refresh_tokens SET used_at=now(),replaced_by_id=${replacement[0].id} WHERE id=${previous.id}`;
      return {
        accessToken: access.token,
        refreshToken: refresh.token,
        expiresIn: Math.floor(accessLifetimeMs / 1000),
        userId: previous.user_id,
      };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function desktopActorFromBearer(authorization: string | null) {
  if (authorization === null || !authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  if (!/^[A-Za-z0-9_-]{32,512}$/.test(token)) return null;
  const client = sql();
  try {
    const rows = await client<{ user_id: string }[]>`
      SELECT at.user_id FROM desktop_access_tokens at
      JOIN desktop_token_families f ON f.id=at.family_id
      WHERE at.token_hash=${hashOpaqueToken(token)} AND at.expires_at>now()
        AND at.revoked_at IS NULL AND f.revoked_at IS NULL
    `;
    return rows[0] === undefined ? null : { userId: rows[0].user_id };
  } finally {
    await client.end({ timeout: 1 });
  }
}
