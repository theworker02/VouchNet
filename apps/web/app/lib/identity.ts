import 'server-only';
import {
  createSecretToken,
  createVerificationCode,
  hashPassword,
  hashOpaqueToken,
  normalizeEmail,
  sessionCookie,
  verifyPassword,
} from '@nexus/auth';
import { createSqlClient } from '@nexus/db';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getMfaStatus } from './mfa';

export const sessionCookieName = 'nexus_session';
const sessionDays = 30;
const sessionIdleHours = 24;

export class IdentityError extends Error {
  constructor(readonly code: 'ACCOUNT_ALREADY_ACTIVE' | 'VERIFICATION_RECENTLY_SENT') {
    super(code);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (value === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return value;
}

function client() {
  return createSqlClient(databaseUrl());
}
function baseSlug(firstName: string, lastName: string): string {
  return `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

export async function registerHuman(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  const sql = client();
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const verification = createSecretToken(24 * 60 * 60 * 1000);
  const verificationCode = createVerificationCode();
  const slug = `${baseSlug(input.firstName, input.lastName)}-${crypto.randomUUID().slice(0, 6)}`;
  try {
    const user = await sql.begin(async (transaction) => {
      const existingRows = await transaction<{ id: string; status: string }[]>`
        SELECT u.id,u.status
        FROM users u
        JOIN user_emails e ON e.user_id=u.id
        WHERE e.email_normalized=${email} AND e.is_primary=true
        FOR UPDATE
      `;
      const existing = existingRows[0];
      if (existing !== undefined) {
        if (existing.status !== 'PENDING_VERIFICATION')
          throw new IdentityError('ACCOUNT_ALREADY_ACTIVE');
        const latestVerification = await transaction<{ created_at: Date }[]>`
          SELECT created_at
          FROM email_verifications
          WHERE user_id=${existing.id} AND used_at IS NULL
          ORDER BY created_at DESC
          LIMIT 1
          FOR UPDATE
        `;
        const latestCreatedAt = latestVerification[0]?.created_at;
        if (latestCreatedAt !== undefined && Date.now() - latestCreatedAt.getTime() < 60 * 1000) {
          throw new IdentityError('VERIFICATION_RECENTLY_SENT');
        }
        // A provider outage or expired link must not trap a legitimate person in a pending account.
        // Replacing the unused token invalidates any prior email before a fresh one is sent. The
        // one-minute cooldown prevents this retry path from becoming an email-sending primitive.
        await transaction`UPDATE email_verifications SET used_at=now() WHERE user_id=${existing.id} AND used_at IS NULL`;
        await transaction`INSERT INTO email_verifications (user_id,token_hash,code_hash,expires_at) VALUES (${existing.id},${verification.tokenHash},${verificationCode.codeHash},${verification.expiresAt})`;
        return existing;
      }
      const rows = await transaction<
        { id: string }[]
      >`INSERT INTO users (password_hash) VALUES (${passwordHash}) RETURNING id`;
      const created = rows[0];
      if (created === undefined) throw new Error('USER_CREATION_FAILED');
      await transaction`INSERT INTO user_emails (user_id,email_normalized) VALUES (${created.id},${email})`;
      await transaction`INSERT INTO profiles (user_id,slug,first_name,last_name) VALUES (${created.id},${slug},${input.firstName.trim()},${input.lastName.trim()})`;
      await transaction`INSERT INTO privacy_settings (user_id) VALUES (${created.id})`;
      await transaction`INSERT INTO terms_acceptances (user_id,document_type,document_version) VALUES (${created.id},'TERMS','2026-09'),(${created.id},'PRIVACY','2026-09')`;
      await transaction`INSERT INTO email_verifications (user_id,token_hash,code_hash,expires_at) VALUES (${created.id},${verification.tokenHash},${verificationCode.codeHash},${verification.expiresAt})`;
      return created;
    });
    return {
      userId: user.id,
      verificationCode: verificationCode.code,
      verificationToken: verification.token,
    };
  } catch (error) {
    if (error instanceof IdentityError) throw error;
    // The email column is uniquely constrained. A concurrent registration must not surface a raw
    // database error or disclose additional account details to the requester.
    if (isUniqueViolation(error)) throw new IdentityError('ACCOUNT_ALREADY_ACTIVE');
    throw error;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function verifyEmail(token: string): Promise<{ userId: string } | null> {
  const sql = client();
  try {
    return await sql.begin(async (transaction) => {
      const rows = await transaction<
        { user_id: string }[]
      >`UPDATE email_verifications SET used_at = now() WHERE token_hash=${hashOpaqueToken(token)} AND used_at IS NULL AND expires_at > now() RETURNING user_id`;
      const verification = rows[0];
      if (verification === undefined) return null;
      await transaction`UPDATE user_emails SET verified_at=now() WHERE user_id=${verification.user_id} AND is_primary=true`;
      await transaction`UPDATE users SET status='ACTIVE',updated_at=now() WHERE id=${verification.user_id} AND status='PENDING_VERIFICATION'`;
      return { userId: verification.user_id };
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function verifyEmailCode(
  emailInput: string,
  code: string,
): Promise<{ userId: string } | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const sql = client();
  try {
    return await sql.begin(async (transaction) => {
      const rows = await transaction<
        { id: string; user_id: string; code_hash: string | null; code_attempts: number }[]
      >`
        SELECT v.id,v.user_id,v.code_hash,v.code_attempts
        FROM email_verifications v
        JOIN user_emails e ON e.user_id=v.user_id
        WHERE e.email_normalized=${normalizeEmail(emailInput)}
          AND e.is_primary=true
          AND v.used_at IS NULL
          AND v.expires_at > now()
        ORDER BY v.created_at DESC
        LIMIT 1
        FOR UPDATE
      `;
      const verification = rows[0];
      if (
        verification === undefined ||
        verification.code_hash === null ||
        verification.code_attempts >= 5
      )
        return null;
      if (verification.code_hash !== hashOpaqueToken(code)) {
        await transaction`UPDATE email_verifications SET code_attempts=code_attempts+1 WHERE id=${verification.id}`;
        return null;
      }
      await transaction`UPDATE email_verifications SET used_at=now() WHERE id=${verification.id}`;
      await transaction`UPDATE user_emails SET verified_at=now() WHERE user_id=${verification.user_id} AND is_primary=true`;
      await transaction`UPDATE users SET status='ACTIVE',updated_at=now() WHERE id=${verification.user_id} AND status='PENDING_VERIFICATION'`;
      return { userId: verification.user_id };
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/**
 * Creates a fresh, single-use verification artifact for the authenticated member. The raw token
 * is returned only to the caller that sends the transactional email; PostgreSQL retains its hash.
 */
export async function beginEmailVerificationLink(userId: string): Promise<{
  email: string;
  firstName: string;
  token: string;
}> {
  const sql = client();
  const verification = createSecretToken(24 * 60 * 60 * 1000);
  try {
    return await sql.begin(async (transaction) => {
      const rows = await transaction<{ email_normalized: string; first_name: string }[]>`
        SELECT e.email_normalized,p.first_name
        FROM user_emails e JOIN profiles p ON p.user_id=e.user_id
        WHERE e.user_id=${userId} AND e.is_primary=true AND e.verified_at IS NULL
        FOR UPDATE
      `;
      const member = rows[0];
      if (member === undefined) throw new IdentityError('ACCOUNT_ALREADY_ACTIVE');
      const latest = await transaction<{ created_at: Date }[]>`
        SELECT created_at FROM email_verifications
        WHERE user_id=${userId} AND used_at IS NULL
        ORDER BY created_at DESC LIMIT 1 FOR UPDATE
      `;
      if (latest[0] !== undefined && Date.now() - latest[0].created_at.getTime() < 60 * 1000)
        throw new IdentityError('VERIFICATION_RECENTLY_SENT');
      await transaction`UPDATE email_verifications SET used_at=now() WHERE user_id=${userId} AND used_at IS NULL`;
      await transaction`INSERT INTO email_verifications (user_id,token_hash,expires_at) VALUES (${userId},${verification.tokenHash},${verification.expiresAt})`;
      return {
        email: member.email_normalized,
        firstName: member.first_name,
        token: verification.token,
      };
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function getPrimaryEmailStatus(userId: string): Promise<{
  email: string;
  verifiedAt: Date | null;
} | null> {
  const sql = client();
  try {
    const rows = await sql<{ email_normalized: string; verified_at: Date | null }[]>`
      SELECT email_normalized,verified_at FROM user_emails
      WHERE user_id=${userId} AND is_primary=true
    `;
    const email = rows[0];
    return email === undefined
      ? null
      : { email: email.email_normalized, verifiedAt: email.verified_at };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function createUserSession(userId: string): Promise<{ token: string }> {
  const sql = client();
  const token = createSecretToken(sessionDays * 24 * 60 * 60 * 1000);
  const idleExpiresAt = new Date(Date.now() + sessionIdleHours * 60 * 60 * 1000);
  try {
    await sql`INSERT INTO sessions (user_id,token_hash,expires_at,idle_expires_at) VALUES (${userId},${token.tokenHash},${token.expiresAt},${idleExpiresAt})`;
    return { token: token.token };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function login(emailInput: string, password: string, priorSessionToken?: string) {
  const sql = client();
  try {
    const rows = await sql<
      { id: string; password_hash: string; status: string }[]
    >`SELECT u.id,u.password_hash,u.status FROM users u JOIN user_emails e ON e.user_id=u.id WHERE e.email_normalized=${normalizeEmail(emailInput)} AND e.is_primary=true`;
    const user = rows[0];
    if (
      user === undefined ||
      user.status !== 'ACTIVE' ||
      !(await verifyPassword(user.password_hash, password))
    )
      return null;
    if ((await getMfaStatus(user.id)).enabled) return { userId: user.id, mfaRequired: true as const };
    const token = createSecretToken(sessionDays * 24 * 60 * 60 * 1000);
    const idleExpiresAt = new Date(Date.now() + sessionIdleHours * 60 * 60 * 1000);
    // Create the replacement session and invalidate the prior browser session through the same
    // short-lived SQL client. This preserves the session-fixation invariant without adding a
    // second database connection to the critical login path.
    await sql.begin(async (transaction) => {
      if (priorSessionToken !== undefined)
        await transaction`
          UPDATE sessions SET revoked_at=now()
          WHERE token_hash=${hashOpaqueToken(priorSessionToken)} AND revoked_at IS NULL
        `;
      await transaction`
        INSERT INTO sessions (user_id,token_hash,expires_at,idle_expires_at)
        VALUES (${user.id},${token.tokenHash},${token.expiresAt},${idleExpiresAt})
      `;
    });
    return { userId: user.id, token: token.token, mfaRequired: false as const };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function beginPasswordReset(emailInput: string) {
  const sql = client();
  try {
    const rows = await sql<
      { id: string }[]
    >`SELECT u.id FROM users u JOIN user_emails e ON e.user_id=u.id WHERE e.email_normalized=${normalizeEmail(emailInput)} AND e.is_primary=true AND u.status='ACTIVE'`;
    const user = rows[0];
    if (user === undefined) return null;
    const reset = createSecretToken(60 * 60 * 1000);
    await sql.begin(async (transaction) => {
      await transaction`UPDATE password_resets SET used_at=now() WHERE user_id=${user.id} AND used_at IS NULL`;
      await transaction`INSERT INTO password_resets (user_id,token_hash,expires_at) VALUES (${user.id},${reset.tokenHash},${reset.expiresAt})`;
      await transaction`INSERT INTO security_events (user_id,event_type) VALUES (${user.id},'AUTH_PASSWORD_RESET_REQUESTED')`;
    });
    return reset.token;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function resetPassword(token: string, password: string) {
  const sql = client();
  try {
    const passwordHash = await hashPassword(password);
    return await sql.begin(async (transaction) => {
      const rows = await transaction<
        { user_id: string }[]
      >`UPDATE password_resets SET used_at=now() WHERE token_hash=${hashOpaqueToken(token)} AND used_at IS NULL AND expires_at>now() RETURNING user_id`;
      const reset = rows[0];
      if (reset === undefined) return false;
      await transaction`UPDATE users SET password_hash=${passwordHash},updated_at=now() WHERE id=${reset.user_id}`;
      await transaction`UPDATE sessions SET revoked_at=now() WHERE user_id=${reset.user_id} AND revoked_at IS NULL`;
      await transaction`INSERT INTO security_events (user_id,event_type) VALUES (${reset.user_id},'AUTH_PASSWORD_RESET_COMPLETED')`;
      return true;
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function actorFromRequest(
  request: NextRequest,
): Promise<{ userId: string; sessionId: string } | null> {
  const token = request.cookies.get(sessionCookieName)?.value;
  return actorFromSessionToken(token);
}

/**
 * Session validation is shared by route handlers and server-rendered pages.
 * A cookie's presence is never treated as authentication without this lookup.
 */
export async function actorFromSessionToken(
  token: string | undefined,
): Promise<{ userId: string; sessionId: string } | null> {
  if (token === undefined) return null;
  const sql = client();
  try {
    const rows = await sql<
      { user_id: string; id: string }[]
    >`SELECT user_id,id FROM sessions WHERE token_hash=${hashOpaqueToken(token)} AND revoked_at IS NULL AND expires_at > now() AND idle_expires_at > now()`;
    const session = rows[0];
    if (session === undefined) return null;
    await sql`UPDATE sessions SET last_active_at=now(),idle_expires_at=LEAST(expires_at,now() + interval '24 hours') WHERE id=${session.id}`;
    return { userId: session.user_id, sessionId: session.id };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/** The only current-user lookup used by server-rendered product routes. React request caching
 * ensures a page tree does not independently validate the same session several times. */
export const getCurrentActor = cache(async () => {
  const cookieStore = await cookies();
  return actorFromSessionToken(cookieStore.get(sessionCookieName)?.value);
});

// Multiple authenticated surfaces (for example, Shell and Home) can need the same profile during
// one server render. React request caching prevents duplicate database round trips without
// retaining profile data beyond that request.
export const getProfileSummary = cache(
  async (
    userId: string,
  ): Promise<{
    fullName: string;
    headline: string | null;
    slug: string;
    location: string | null;
    about: string | null;
    avatarKey: string | null;
    onboardingStep: number;
  } | null> => {
    const sql = client();
    try {
      const rows = await sql<
        {
          first_name: string;
          last_name: string;
          headline: string | null;
          slug: string;
          location: string | null;
          about: string | null;
          avatar_key: string | null;
          onboarding_step: number;
        }[]
      >`
      SELECT first_name,last_name,headline,slug,location,about,avatar_key,onboarding_step
      FROM profiles
      WHERE user_id=${userId}
    `;
      const profile = rows[0];
      if (profile === undefined) return null;
      return {
        fullName: `${profile.first_name} ${profile.last_name}`,
        headline: profile.headline,
        slug: profile.slug,
        location: profile.location,
        about: profile.about,
        avatarKey: profile.avatar_key,
        onboardingStep: profile.onboarding_step,
      };
    } finally {
      await sql.end({ timeout: 1 });
    }
  },
);

export async function updateOwnProfile(
  userId: string,
  input: {
    headline: string | null;
    location: string | null;
    about: string | null;
    onboardingStep: number;
  },
) {
  const sql = client();
  try {
    await sql`
      UPDATE profiles
      SET headline=${input.headline},location=${input.location},about=${input.about},
          onboarding_step=${input.onboardingStep},updated_at=now()
      WHERE user_id=${userId}
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function logout(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;
  if (token !== undefined) {
    const sql = client();
    try {
      await sql`UPDATE sessions SET revoked_at=now() WHERE token_hash=${hashOpaqueToken(token)} AND revoked_at IS NULL`;
    } finally {
      await sql.end({ timeout: 1 });
    }
  }
}
export async function listSessions(userId: string) {
  const sql = client();
  try {
    return await sql<
      { id: string; created_at: Date; last_active_at: Date; user_agent: string | null }[]
    >`SELECT id,created_at,last_active_at,user_agent FROM sessions WHERE user_id=${userId} AND revoked_at IS NULL AND expires_at>now() AND idle_expires_at>now() ORDER BY last_active_at DESC`;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
export async function revokeSession(userId: string, sessionId: string) {
  const sql = client();
  try {
    const rows = await sql<
      { id: string }[]
    >`UPDATE sessions SET revoked_at=now() WHERE id=${sessionId} AND user_id=${userId} AND revoked_at IS NULL RETURNING id`;
    return rows.length === 1;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
export async function revokeOtherSessions(userId: string, currentSessionId: string) {
  const sql = client();
  try {
    await sql`UPDATE sessions SET revoked_at=now() WHERE user_id=${userId} AND id<>${currentSessionId} AND revoked_at IS NULL`;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
export function attachSession(response: NextResponse, token: string) {
  response.headers.set(
    'set-cookie',
    sessionCookie(sessionCookieName, token, process.env.NEXUS_ENV === 'production'),
  );
  return response;
}
export function clearSession(response: NextResponse) {
  response.headers.set(
    'set-cookie',
    `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
  );
  return response;
}
