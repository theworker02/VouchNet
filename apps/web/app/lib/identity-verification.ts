import 'server-only';
import { createSqlClient } from '@nexus/db';
import Stripe from 'stripe';
import { stripeClient } from './stripe';
import {
  identityMethodDocumentSelfie,
  stripeSessionStatus,
  type IdentityVerificationStatus,
} from './identity-verification-model';

/**
 * Optional identity verification. VouchNet's own verification layer sits in front of a swappable
 * provider connection: Stripe Identity today, another provider (for example Veriff) later. Only
 * the provider adapter touches provider SDKs; the rest of the app reads the normalized
 * `identity_verifications` record, so a new provider only means adding an adapter. VouchNet never
 * stores ID images, document numbers, or biometric data — only the provider's opaque session id,
 * the outcome, the method, and the verification date.
 */

export type { IdentityVerificationStatus };

export interface IdentityVerificationSummary {
  status: IdentityVerificationStatus;
  method: string | null;
  verifiedAt: Date | null;
  badgeVisible: boolean;
}

/** What the public badge card is allowed to reveal: what was checked, and when. */
export interface PublicVerificationBadge {
  method: string;
  verifiedAt: Date;
}

/** Normalized result a provider adapter reports back from a signed webhook event. */
export interface ProviderVerificationResult {
  sessionId: string;
  status: IdentityVerificationStatus;
  method: string | null;
}

export interface IdentityVerificationProvider {
  name: string;
  isConfigured(): boolean;
  startSession(input: { userId: string; returnUrl: string }): Promise<{
    sessionId: string;
    url: string;
    method: string;
  }>;
  webhookSecrets(): string[];
  parseWebhook(payload: string, signature: string): ProviderVerificationResult | null;
}

const stripeIdentityMethod = identityMethodDocumentSelfie;

const stripeIdentityProvider: IdentityVerificationProvider = {
  name: 'stripe',
  isConfigured() {
    return Boolean(
      process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_IDENTITY_WEBHOOK_SECRET?.trim(),
    );
  },
  async startSession({ userId, returnUrl }) {
    const session = await stripeClient().identity.verificationSessions.create({
      type: 'document',
      metadata: { userId },
      return_url: returnUrl,
      options: { document: { require_matching_selfie: true } },
    });
    if (session.url === null) throw new Error('PROVIDER_SESSION_UNAVAILABLE');
    return { sessionId: session.id, url: session.url, method: stripeIdentityMethod };
  },
  webhookSecrets() {
    return [process.env.STRIPE_IDENTITY_WEBHOOK_SECRET?.trim() ?? ''].filter(
      (secret) => secret.length > 0,
    );
  },
  parseWebhook(payload, signature) {
    for (const secret of this.webhookSecrets()) {
      try {
        const event = stripeClient().webhooks.constructEvent(payload, signature, secret);
        if (!event.type.startsWith('identity.verification_session.')) return null;
        const session = event.data.object as Stripe.Identity.VerificationSession;
        return {
          sessionId: session.id,
          status: stripeSessionStatus(session.status),
          method: stripeIdentityMethod,
        };
      } catch {
        // Try the next configured secret before declaring the signature invalid.
      }
    }
    return null;
  },
};

/** Registry keyed by IDENTITY_VERIFICATION_PROVIDER. Adding Veriff means adding an adapter here. */
const providers: Record<string, IdentityVerificationProvider> = {
  stripe: stripeIdentityProvider,
};

export function verificationProvider(): IdentityVerificationProvider {
  return (
    providers[process.env.IDENTITY_VERIFICATION_PROVIDER?.trim() ?? 'stripe'] ??
    stripeIdentityProvider
  );
}

function sql() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

export async function latestVerification(
  userId: string,
): Promise<IdentityVerificationSummary | null> {
  const client = sql();
  try {
    const rows = await client<
      {
        status: IdentityVerificationStatus;
        method: string | null;
        verified_at: Date | null;
        badge_visible: boolean;
      }[]
    >`
      SELECT status,method,verified_at,badge_visible
      FROM identity_verifications
      WHERE user_id=${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const row = rows[0];
    return row === undefined
      ? null
      : {
          status: row.status,
          method: row.method,
          verifiedAt: row.verified_at,
          badgeVisible: row.badge_visible,
        };
  } finally {
    await client.end({ timeout: 1 });
  }
}

/**
 * The only read used for badge and vouch-level decisions. Provider identity is deliberately not
 * returned: consumers check whether someone is verified, never who performed the check.
 */
export async function publicVerificationBadge(
  userId: string,
): Promise<PublicVerificationBadge | null> {
  const client = sql();
  try {
    const rows = await client<{ method: string; verified_at: Date }[]>`
      SELECT method,verified_at
      FROM identity_verifications
      WHERE user_id=${userId} AND status='VERIFIED' AND badge_visible=true
    `;
    const row = rows[0];
    return row === undefined ? null : { method: row.method, verifiedAt: row.verified_at };
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function startIdentityVerification(input: {
  userId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const provider = verificationProvider();
  const client = sql();
  try {
    const verified = await client<{ id: string }[]>`
      SELECT id FROM identity_verifications
      WHERE user_id=${input.userId} AND status='VERIFIED'
      LIMIT 1
    `;
    if (verified.length > 0) throw new Error('ALREADY_VERIFIED');
    const pending = await client<{ id: string; created_at: Date }[]>`
      SELECT id,created_at FROM identity_verifications
      WHERE user_id=${input.userId} AND status IN ('PENDING','REQUIRES_INPUT')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const latest = pending[0];
    if (latest !== undefined && Date.now() - latest.created_at.getTime() < 60 * 1000)
      throw new Error('VERIFICATION_RECENTLY_STARTED');
    const session = await provider.startSession({
      userId: input.userId,
      returnUrl: input.returnUrl,
    });
    await client`
      INSERT INTO identity_verifications (user_id,provider,provider_session_id,status,method)
      VALUES (${input.userId},${provider.name},${session.sessionId},'PENDING',${session.method})
    `;
    return { url: session.url };
  } finally {
    await client.end({ timeout: 1 });
  }
}

/** Idempotent: webhook redelivery converges to the same row state. */
export async function applyProviderResult(result: ProviderVerificationResult): Promise<void> {
  const provider = verificationProvider();
  const client = sql();
  try {
    await client`
      UPDATE identity_verifications
      SET status=${result.status},
          method=COALESCE(method,${result.method}),
          verified_at=CASE WHEN ${result.status}='VERIFIED' THEN now() ELSE verified_at END,
          badge_visible=CASE WHEN ${result.status}='VERIFIED' THEN true ELSE badge_visible END,
          updated_at=now()
      WHERE provider=${provider.name} AND provider_session_id=${result.sessionId}
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function setVerificationBadgeVisible(
  userId: string,
  visible: boolean,
): Promise<boolean> {
  const client = sql();
  try {
    const rows = await client<{ id: string }[]>`
      UPDATE identity_verifications
      SET badge_visible=${visible},updated_at=now()
      WHERE user_id=${userId} AND status='VERIFIED'
      RETURNING id
    `;
    return rows.length === 1;
  } finally {
    await client.end({ timeout: 1 });
  }
}
