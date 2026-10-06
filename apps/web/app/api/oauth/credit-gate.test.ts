import { createHash, createHmac, randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  balanceOf,
  createTestDatabase,
  insertUser,
  ledgerOf,
  type TestDatabase,
} from '../../../test/pglite-sql';
import { recordTopUp } from '../../lib/api-credits-ledger';
import { GET as applicantData } from '../v1/oauth/applicant-data/route';
import { GET as candidateProfile } from '../v1/oauth/candidate-profile/route';
import { POST as v1Token } from '../v1/oauth/token/route';
import { POST as token } from './token/route';
import { GET as userinfo } from './userinfo/route';

const state = vi.hoisted(() => ({ database: null as TestDatabase | null }));

vi.mock('@nexus/db', () => ({
  createSqlClient: () => {
    if (state.database === null) throw new Error('TEST_DATABASE_NOT_READY');
    return state.database.sql;
  },
}));
// The distributed Redis limiter is covered elsewhere; these tests isolate the credit gate.
vi.mock('../../lib/security/rate-limit', () => ({
  enforceRateLimit: async () => ({ allowed: true }),
}));

const signingKey = 'test-signing-key-with-at-least-thirty-two-characters';
process.env.VOUCHNET_OAUTH_SIGNING_KEY = signingKey;
process.env.DATABASE_URL = 'postgres://pglite.invalid/test';
process.env.APP_URL = 'https://vouchnet.dev';

const redirectUri = 'https://hiring.example.com/callback';
const clientSecret = `vns_${'s'.repeat(40)}`;
let ownerId: string;
let memberId: string;
let developerClientId: string;
let clientId: string;
let accessToken: string;

const opaqueHash = (value: string) => createHmac('sha256', signingKey).update(value).digest('hex');

beforeAll(async () => {
  state.database = await createTestDatabase();
});

afterAll(async () => {
  await state.database?.close();
});

beforeEach(async () => {
  const db = state.database!.db;
  ownerId = await insertUser(db);
  memberId = await insertUser(db);
  const suffix = randomBytes(4).toString('hex');
  await db.query(
    `INSERT INTO profiles (user_id,slug,first_name,last_name,headline) VALUES ($1,$2,'Ada','Lovelace','Engineer')`,
    [memberId, `ada-${suffix}`],
  );
  await db.query(
    `INSERT INTO user_emails (user_id,email_normalized,verified_at,is_primary) VALUES ($1,$2,now(),true)`,
    [memberId, `ada-${suffix}@example.com`],
  );
  clientId = `vn_test_${suffix}`;
  const client = await db.query<{ id: string }>(
    `INSERT INTO developer_clients (owner_id,client_id,client_secret_hash,name,redirect_uris)
     VALUES ($1,$2,$3,'Hiring site',$4::jsonb) RETURNING id`,
    [ownerId, clientId, opaqueHash(clientSecret), JSON.stringify([redirectUri])],
  );
  developerClientId = client.rows[0]!.id;
  accessToken = `vnat_${randomBytes(24).toString('base64url')}`;
  await db.query(
    `INSERT INTO oauth_access_tokens (client_id,user_id,token_hash,scopes,expires_at,last_used_at)
     VALUES ($1,$2,$3,'["profile:read"]'::jsonb,now()+interval '1 hour','2020-01-01T00:00:00Z')`,
    [developerClientId, memberId, opaqueHash(accessToken)],
  );
});

async function fundOwner(amountCents: number) {
  await recordTopUp(state.database!.sql, {
    userId: ownerId,
    amountCents,
    currency: 'usd',
    providerReference: `cs_test_owner_${ownerId}_${amountCents}`,
  });
}

function bearer(path: string, value = accessToken) {
  return new NextRequest(`https://vouchnet.dev${path}`, {
    headers: { authorization: `Bearer ${value}` },
  });
}

async function issueCode() {
  const code = `vnc_${randomBytes(24).toString('base64url')}`;
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  await state.database!.db.query(
    `INSERT INTO oauth_authorization_codes (client_id,user_id,code_hash,redirect_uri,scopes,code_challenge,expires_at)
     VALUES ($1,$2,$3,$4,'["profile:read"]'::jsonb,$5,now()+interval '5 minutes')`,
    [developerClientId, memberId, opaqueHash(code), redirectUri, challenge],
  );
  return { code, verifier };
}

function tokenRequest(code: string, verifier: string, path = '/api/oauth/token') {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  return new NextRequest(`https://vouchnet.dev${path}`, { method: 'POST', body });
}

async function codeUsed(code: string) {
  const result = await state.database!.db.query<{ used_at: Date | null }>(
    'SELECT used_at FROM oauth_authorization_codes WHERE code_hash=$1',
    [opaqueHash(code)],
  );
  return result.rows[0]?.used_at !== null;
}

describe('prepaid credit gate on public API entry points', () => {
  it('returns 402 INSUFFICIENT_CREDITS and performs nothing when the client owner has no credits', async () => {
    const response = await userinfo(bearer('/api/oauth/userinfo'));
    expect(response.status).toBe(402);
    expect(await response.json()).toEqual({
      error: 'INSUFFICIENT_CREDITS',
      error_description: expect.any(String),
      required_credits: 1,
      balance_credits: 0,
      top_up_url: 'https://vouchnet.dev/settings/developers',
    });
    const lastUsed = await state.database!.db.query<{ last_used_at: Date }>(
      'SELECT last_used_at FROM oauth_access_tokens WHERE token_hash=$1',
      [opaqueHash(accessToken)],
    );
    expect(lastUsed.rows[0]?.last_used_at.getUTCFullYear()).toBe(2020);
    expect(await ledgerOf(state.database!.db, ownerId)).toHaveLength(0);
  });

  it('charges the client owner, never the member, for a successful userinfo call', async () => {
    await fundOwner(1); // 10 credits
    const response = await userinfo(bearer('/api/oauth/userinfo'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ sub: memberId, given_name: 'Ada' });
    expect(await balanceOf(state.database!.db, ownerId)).toBe(9);
    expect((await ledgerOf(state.database!.db, ownerId)).at(-1)).toMatchObject({
      kind: 'USAGE',
      operation: 'oauth.userinfo',
      developer_client_id: developerClientId,
    });
    expect(await ledgerOf(state.database!.db, memberId)).toHaveLength(0);
  });

  it('meters applicant data and its candidate-profile alias at their configured cost', async () => {
    await fundOwner(1);
    expect((await applicantData(bearer('/api/v1/oauth/applicant-data'))).status).toBe(200);
    expect((await candidateProfile(bearer('/api/v1/oauth/candidate-profile'))).status).toBe(200);
    expect(await balanceOf(state.database!.db, ownerId)).toBe(6);
    const partial = await state.database!.db.query(
      'UPDATE api_credit_balances SET balance_credits=1 WHERE user_id=$1',
      [ownerId],
    );
    expect(partial.affectedRows).toBe(1);
    const refused = await applicantData(bearer('/api/v1/oauth/applicant-data'));
    expect(refused.status).toBe(402);
    expect(await refused.json()).toMatchObject({ required_credits: 2, balance_credits: 1 });
  });

  it('does not charge calls that fail authentication', async () => {
    await fundOwner(1);
    const response = await userinfo(bearer('/api/oauth/userinfo', 'vnat_not_a_real_token'));
    expect(response.status).toBe(401);
    expect(await balanceOf(state.database!.db, ownerId)).toBe(10);
  });

  it('refuses token exchange with 402 and leaves the one-use code available for a retry', async () => {
    const { code, verifier } = await issueCode();
    const refused = await token(tokenRequest(code, verifier));
    expect(refused.status).toBe(402);
    expect(await refused.json()).toMatchObject({ error: 'INSUFFICIENT_CREDITS' });
    expect(await codeUsed(code)).toBe(false);

    await fundOwner(1);
    const exchanged = await v1Token(tokenRequest(code, verifier, '/api/v1/oauth/token'));
    expect(exchanged.status).toBe(200);
    expect(await exchanged.json()).toMatchObject({ token_type: 'Bearer' });
    expect(await codeUsed(code)).toBe(true);
    expect(await balanceOf(state.database!.db, ownerId)).toBe(9);
  });

  it('does not charge a token exchange with the wrong client secret', async () => {
    await fundOwner(1);
    const { code, verifier } = await issueCode();
    const request = tokenRequest(code, verifier);
    const body = new URLSearchParams(await request.text());
    body.set('client_secret', `vns_${'x'.repeat(40)}`);
    const response = await token(
      new NextRequest('https://vouchnet.dev/api/oauth/token', { method: 'POST', body }),
    );
    expect(response.status).toBe(400);
    expect(await balanceOf(state.database!.db, ownerId)).toBe(10);
  });
});
