import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { hashPassword, normalizeEmail } from '@nexus/auth';
import { createSqlClient } from '@nexus/db';
import { NextRequest, NextResponse } from 'next/server';
import { createUserSession } from './identity';

export const oauthProviders = ['google', 'github', 'linkedin'] as const;
export type OAuthProvider = (typeof oauthProviders)[number];
type ProviderKey = Uppercase<OAuthProvider>;

type OAuthCookieState = {
  provider: OAuthProvider;
  state: string;
  verifier: string;
  returnTo: string | null;
  expiresAt: number;
};
type OAuthRegistration = { userId: string; expiresAt: number };
type ProviderIdentity = {
  subject: string;
  email: string;
  firstName: string;
  lastName: string;
};

const stateCookieName = 'vouch_oauth_state';
const registrationCookieName = 'vouch_oauth_registration';
const stateLifetimeSeconds = 10 * 60;

export class OAuthError extends Error {
  constructor(
    readonly code:
      | 'OAUTH_UNAVAILABLE'
      | 'OAUTH_STATE_INVALID'
      | 'OAUTH_DENIED'
      | 'OAUTH_EXCHANGE_FAILED'
      | 'OAUTH_IDENTITY_INVALID'
      | 'OAUTH_EMAIL_CONFLICT'
      | 'OAUTH_REGISTRATION_INVALID',
  ) {
    super(code);
  }
}

function database() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

function cookieSecret(): string {
  const value = process.env.SESSION_SECRET;
  if (value === undefined || value.length < 32) throw new OAuthError('OAUTH_UNAVAILABLE');
  return value;
}

function sign(value: string): string {
  return createHmac('sha256', cookieSecret()).update(value).digest('base64url');
}

function serialize(value: OAuthCookieState | OAuthRegistration): string {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function deserialize<T extends OAuthCookieState | OAuthRegistration>(
  value: string | undefined,
): T | null {
  if (value === undefined) return null;
  const [payload, signature, ...extra] = value.split('.');
  if (payload === undefined || signature === undefined || extra.length > 0) return null;
  const expected = sign(payload);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  )
    return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
    return typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

function codeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

function baseUrl(): URL {
  return new URL(process.env.APP_URL ?? 'http://localhost:3002');
}

function redirectUri(provider: OAuthProvider): string {
  return new URL(`/api/auth/oauth/${provider}/callback`, baseUrl()).toString();
}

function credentials(provider: OAuthProvider): { clientId: string; clientSecret: string } {
  const prefix = provider.toUpperCase() as ProviderKey;
  const clientId = process.env[`${prefix}_OAUTH_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_OAUTH_CLIENT_SECRET`];
  if (clientId === undefined || clientSecret === undefined)
    throw new OAuthError('OAUTH_UNAVAILABLE');
  return { clientId, clientSecret };
}

function oauthAuthorizationUrl(provider: OAuthProvider, state: string, verifier: string): URL {
  const { clientId } = credentials(provider);
  const url = new URL(
    provider === 'google'
      ? 'https://accounts.google.com/o/oauth2/v2/auth'
      : provider === 'github'
        ? 'https://github.com/login/oauth/authorize'
        : 'https://www.linkedin.com/oauth/v2/authorization',
  );
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri(provider));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge(verifier));
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set(
    'scope',
    provider === 'google'
      ? 'openid email profile'
      : provider === 'github'
        ? 'read:user user:email'
        : 'openid profile email',
  );
  if (provider === 'google') {
    url.searchParams.set('access_type', 'online');
    url.searchParams.set('prompt', 'select_account');
  }
  return url;
}

export function beginOAuth(request: NextRequest, provider: OAuthProvider): NextResponse {
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const requestedReturnTo = request.nextUrl.searchParams.get('next');
  const returnTo =
    requestedReturnTo !== null &&
    requestedReturnTo.startsWith('/') &&
    !requestedReturnTo.startsWith('//')
      ? requestedReturnTo
      : null;
  const response = NextResponse.redirect(oauthAuthorizationUrl(provider, state, verifier));
  response.cookies.set({
    name: stateCookieName,
    value: serialize({
      provider,
      state,
      verifier,
      returnTo,
      expiresAt: Date.now() + stateLifetimeSeconds * 1000,
    }),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NEXUS_ENV === 'production',
    maxAge: stateLifetimeSeconds,
    path: '/api/auth/oauth',
  });
  return response;
}

async function tokenForCode(
  provider: OAuthProvider,
  code: string,
  verifier: string,
): Promise<string> {
  const { clientId, clientSecret } = credentials(provider);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri(provider),
    grant_type: 'authorization_code',
    code_verifier: verifier,
  });
  const endpoint =
    provider === 'google'
      ? 'https://oauth2.googleapis.com/token'
      : provider === 'github'
        ? 'https://github.com/login/oauth/access_token'
        : 'https://www.linkedin.com/oauth/v2/accessToken';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  const result = (await response.json().catch(() => null)) as { access_token?: unknown } | null;
  if (!response.ok || typeof result?.access_token !== 'string')
    throw new OAuthError('OAUTH_EXCHANGE_FAILED');
  return result.access_token;
}

function identityName(name: unknown, fallback: string): { firstName: string; lastName: string } {
  const value = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  const [first = fallback, ...rest] = value.split(' ').filter(Boolean);
  return { firstName: first.slice(0, 80), lastName: (rest.join(' ') || 'Member').slice(0, 80) };
}

async function responseJson(url: string, token: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'user-agent': 'VouchNet OAuth',
    },
    cache: 'no-store',
  });
  const result = (await response.json().catch(() => null)) as unknown;
  if (!response.ok || result === null) throw new OAuthError('OAUTH_IDENTITY_INVALID');
  return result;
}

async function identityForToken(provider: OAuthProvider, token: string): Promise<ProviderIdentity> {
  if (provider === 'github') {
    const user = (await responseJson('https://api.github.com/user', token)) as Record<
      string,
      unknown
    >;
    const emails = await responseJson('https://api.github.com/user/emails', token).catch(
      () => null,
    );
    const emailRows = Array.isArray(emails) ? emails : [];
    const primaryEmail = emailRows.find(
      (entry): entry is Record<string, unknown> =>
        typeof entry === 'object' &&
        entry !== null &&
        entry.primary === true &&
        entry.verified === true &&
        typeof entry.email === 'string',
    );
    const subject = typeof user.id === 'number' ? String(user.id) : null;
    const login = typeof user.login === 'string' ? user.login : 'member';
    if (subject === null || primaryEmail === undefined)
      throw new OAuthError('OAUTH_IDENTITY_INVALID');
    const name = identityName(user.name, login);
    return { subject, email: primaryEmail.email as string, ...name };
  }
  const user = (await responseJson(
    provider === 'google'
      ? 'https://openidconnect.googleapis.com/v1/userinfo'
      : 'https://api.linkedin.com/v2/userinfo',
    token,
  )) as Record<string, unknown>;
  const subject = typeof user.sub === 'string' ? user.sub : null;
  const email = typeof user.email === 'string' ? user.email : null;
  if (subject === null || email === null || user.email_verified !== true)
    throw new OAuthError('OAUTH_IDENTITY_INVALID');
  const fallback = email.split('@')[0] || 'member';
  const name = identityName(
    typeof user.name === 'string'
      ? user.name
      : `${typeof user.given_name === 'string' ? user.given_name : ''} ${typeof user.family_name === 'string' ? user.family_name : ''}`,
    fallback,
  );
  return { subject, email, ...name };
}

function profileSlug(firstName: string, lastName: string): string {
  const base = `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  return `${base || 'member'}-${randomBytes(4).toString('hex')}`;
}

export async function resolveOAuthCallback(request: NextRequest, provider: OAuthProvider) {
  const parameters = request.nextUrl.searchParams;
  if (parameters.has('error')) throw new OAuthError('OAUTH_DENIED');
  const code = parameters.get('code');
  const returnedState = parameters.get('state');
  const savedState = deserialize<OAuthCookieState>(request.cookies.get(stateCookieName)?.value);
  if (
    code === null ||
    returnedState === null ||
    savedState === null ||
    savedState.provider !== provider ||
    savedState.state !== returnedState
  )
    throw new OAuthError('OAUTH_STATE_INVALID');

  const token = await tokenForCode(provider, code, savedState.verifier);
  const identity = await identityForToken(provider, token);
  const sql = database();
  try {
    const existing = await sql<{ user_id: string; status: string }[]>`
      SELECT identity.user_id,u.status
      FROM oauth_identities identity
      JOIN users u ON u.id=identity.user_id
      WHERE identity.provider=${provider.toUpperCase()} AND identity.provider_subject=${identity.subject}
    `;
    if (existing[0] !== undefined) {
      if (existing[0].status === 'ACTIVE') {
        await sql`UPDATE oauth_identities SET last_used_at=now() WHERE provider=${provider.toUpperCase()} AND provider_subject=${identity.subject}`;
        return {
          type: 'session' as const,
          userId: existing[0].user_id,
          returnTo: savedState.returnTo,
        };
      }
      if (existing[0].status === 'PENDING_VERIFICATION')
        return {
          type: 'registration' as const,
          userId: existing[0].user_id,
          returnTo: savedState.returnTo,
        };
      throw new OAuthError('OAUTH_IDENTITY_INVALID');
    }

    const email = normalizeEmail(identity.email);
    const usedEmail = await sql<{ id: string }[]>`
      SELECT u.id FROM users u JOIN user_emails e ON e.user_id=u.id
      WHERE e.email_normalized=${email} AND e.is_primary=true
    `;
    if (usedEmail[0] !== undefined) throw new OAuthError('OAUTH_EMAIL_CONFLICT');

    const passwordHash = await hashPassword(randomBytes(48).toString('base64url'));
    const created = await sql.begin(async (transaction) => {
      const users = await transaction<{ id: string }[]>`
        INSERT INTO users (password_hash,status) VALUES (${passwordHash},'PENDING_VERIFICATION') RETURNING id
      `;
      const user = users[0];
      if (user === undefined) throw new Error('OAUTH_USER_CREATE_FAILED');
      await transaction`INSERT INTO user_emails (user_id,email_normalized,verified_at) VALUES (${user.id},${email},now())`;
      await transaction`INSERT INTO profiles (user_id,slug,first_name,last_name) VALUES (${user.id},${profileSlug(identity.firstName, identity.lastName)},${identity.firstName},${identity.lastName})`;
      await transaction`INSERT INTO privacy_settings (user_id) VALUES (${user.id})`;
      await transaction`INSERT INTO oauth_identities (user_id,provider,provider_subject,provider_email) VALUES (${user.id},${provider.toUpperCase()},${identity.subject},${email})`;
      await transaction`INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision) VALUES ('HUMAN',${user.id},${user.id},'OAUTH_IDENTITY_CREATED','OAUTH_IDENTITY',NULL,${randomUUID()},'SUCCESS','REQUIRE_TERMS_ACCEPTANCE')`;
      return user;
    });
    return { type: 'registration' as const, userId: created.id, returnTo: savedState.returnTo };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export function applyOAuthStateClear(response: NextResponse) {
  response.cookies.set({ name: stateCookieName, value: '', maxAge: 0, path: '/api/auth/oauth' });
  return response;
}

export function issueOAuthRegistration(response: NextResponse, userId: string) {
  response.cookies.set({
    name: registrationCookieName,
    value: serialize({ userId, expiresAt: Date.now() + stateLifetimeSeconds * 1000 }),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NEXUS_ENV === 'production',
    maxAge: stateLifetimeSeconds,
    path: '/api/auth/oauth',
  });
  return response;
}

export async function completeOAuthRegistration(request: NextRequest) {
  const registration = deserialize<OAuthRegistration>(
    request.cookies.get(registrationCookieName)?.value,
  );
  if (registration === null) throw new OAuthError('OAUTH_REGISTRATION_INVALID');
  const sql = database();
  try {
    await sql.begin(async (transaction) => {
      const user = await transaction<{ id: string }[]>`
        SELECT u.id FROM users u
        WHERE u.id=${registration.userId} AND u.status='PENDING_VERIFICATION'
          AND EXISTS (SELECT 1 FROM oauth_identities identity WHERE identity.user_id=u.id)
        FOR UPDATE
      `;
      if (user[0] === undefined) throw new OAuthError('OAUTH_REGISTRATION_INVALID');
      await transaction`INSERT INTO terms_acceptances (user_id,document_type,document_version) VALUES (${registration.userId},'TERMS','2026-09'),(${registration.userId},'PRIVACY','2026-09') ON CONFLICT DO NOTHING`;
      await transaction`UPDATE users SET status='ACTIVE',updated_at=now() WHERE id=${registration.userId}`;
      await transaction`INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision) VALUES ('HUMAN',${registration.userId},${registration.userId},'OAUTH_SIGNUP_COMPLETED','USER',${registration.userId},${randomUUID()},'SUCCESS','TERMS_ACCEPTED_BY_HUMAN')`;
    });
    return await createUserSession(registration.userId);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export function clearOAuthRegistration(response: NextResponse) {
  response.cookies.set({
    name: registrationCookieName,
    value: '',
    maxAge: 0,
    path: '/api/auth/oauth',
  });
  return response;
}
