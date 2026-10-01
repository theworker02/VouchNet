import { createSqlClient } from '@nexus/db';

export const plusFeatures = {
  profileAnalytics: 'PROFILE_ANALYTICS',
  featuredProof: 'FEATURED_PROOF',
  priorityOutreach: 'PRIORITY_OUTREACH',
  emeraldSignal: 'EMERALD_SIGNAL',
  advancedMute: 'ADVANCED_MUTE',
} as const;

export type PlusFeature = (typeof plusFeatures)[keyof typeof plusFeatures];

export type SubscriptionSummary = {
  tier: 'FREE' | 'PLUS';
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
  customerId: string | null;
  subscriptionId: string | null;
  currentPeriodEndsAt: Date | null;
};

function client() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

/** Server-only entitlement check. UI state never establishes a paid capability. */
export async function hasVouchNetPlus(userId: string): Promise<boolean> {
  const sql = client();
  try {
    const rows = await sql<
      { tier: 'FREE' | 'PLUS'; status: string; current_period_ends_at: Date | null }[]
    >`
      SELECT tier,status,current_period_ends_at FROM user_subscriptions WHERE user_id=${userId}
    `;
    const subscription = rows[0];
    return (
      subscription !== undefined &&
      subscription.tier === 'PLUS' &&
      subscription.status === 'ACTIVE' &&
      (subscription.current_period_ends_at === null ||
        subscription.current_period_ends_at > new Date())
    );
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function getSubscriptionSummary(userId: string): Promise<SubscriptionSummary> {
  const sql = client();
  try {
    const rows = await sql<
      {
        tier: SubscriptionSummary['tier'];
        status: SubscriptionSummary['status'];
        provider_customer_id: string | null;
        provider_subscription_id: string | null;
        current_period_ends_at: Date | null;
      }[]
    >`
      SELECT tier,status,provider_customer_id,provider_subscription_id,current_period_ends_at
      FROM user_subscriptions WHERE user_id=${userId}
    `;
    const subscription = rows[0];
    return subscription === undefined
      ? {
          tier: 'FREE',
          status: 'ACTIVE',
          customerId: null,
          subscriptionId: null,
          currentPeriodEndsAt: null,
        }
      : {
          tier: subscription.tier,
          status: subscription.status,
          customerId: subscription.provider_customer_id,
          subscriptionId: subscription.provider_subscription_id,
          currentPeriodEndsAt: subscription.current_period_ends_at,
        };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/** Stripe webhooks, not browser redirects, establish or change a paid entitlement. */
export async function syncStripeSubscription(input: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: SubscriptionSummary['status'];
  currentPeriodEndsAt: Date | null;
}): Promise<void> {
  const sql = client();
  try {
    const tier = input.status === 'ACTIVE' ? 'PLUS' : 'FREE';
    await sql`
      INSERT INTO user_subscriptions (
        user_id,tier,status,monthly_price_cents,provider_customer_id,provider_subscription_id,current_period_ends_at
      ) VALUES (
        ${input.userId},${tier},${input.status},${tier === 'PLUS' ? 455 : 0},${input.customerId},${input.subscriptionId},${input.currentPeriodEndsAt}
      ) ON CONFLICT (user_id) DO UPDATE SET
        tier=EXCLUDED.tier,status=EXCLUDED.status,monthly_price_cents=EXCLUDED.monthly_price_cents,
        provider_customer_id=EXCLUDED.provider_customer_id,provider_subscription_id=EXCLUDED.provider_subscription_id,
        current_period_ends_at=EXCLUDED.current_period_ends_at,updated_at=now()
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function requireVouchNetPlus(userId: string, feature: PlusFeature): Promise<void> {
  if (!(await hasVouchNetPlus(userId))) throw new Error(`PLUS_REQUIRED:${feature}`);
}

export async function hasDeveloperAccess(userId: string): Promise<boolean> {
  const sql = client();
  try {
    const rows = await sql<
      { status: SubscriptionSummary['status']; current_period_ends_at: Date | null }[]
    >`
      SELECT status,current_period_ends_at FROM developer_access_subscriptions WHERE user_id=${userId}
    `;
    const access = rows[0];
    return (
      access !== undefined &&
      access.status === 'ACTIVE' &&
      (access.current_period_ends_at === null || access.current_period_ends_at > new Date())
    );
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function getDeveloperAccessSummary(
  userId: string,
): Promise<Omit<SubscriptionSummary, 'tier'>> {
  const sql = client();
  try {
    const rows = await sql<
      {
        status: SubscriptionSummary['status'];
        provider_customer_id: string | null;
        provider_subscription_id: string | null;
        current_period_ends_at: Date | null;
      }[]
    >`
      SELECT status,provider_customer_id,provider_subscription_id,current_period_ends_at
      FROM developer_access_subscriptions WHERE user_id=${userId}
    `;
    const access = rows[0];
    return access === undefined
      ? { status: 'ACTIVE', customerId: null, subscriptionId: null, currentPeriodEndsAt: null }
      : {
          status: access.status,
          customerId: access.provider_customer_id,
          subscriptionId: access.provider_subscription_id,
          currentPeriodEndsAt: access.current_period_ends_at,
        };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function syncStripeDeveloperAccess(input: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: SubscriptionSummary['status'];
  currentPeriodEndsAt: Date | null;
}): Promise<void> {
  const sql = client();
  try {
    await sql`
      INSERT INTO developer_access_subscriptions (
        user_id,status,provider_customer_id,provider_subscription_id,current_period_ends_at
      ) VALUES (${input.userId},${input.status},${input.customerId},${input.subscriptionId},${input.currentPeriodEndsAt})
      ON CONFLICT (user_id) DO UPDATE SET
        status=EXCLUDED.status,provider_customer_id=EXCLUDED.provider_customer_id,
        provider_subscription_id=EXCLUDED.provider_subscription_id,
        current_period_ends_at=EXCLUDED.current_period_ends_at,updated_at=now()
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
