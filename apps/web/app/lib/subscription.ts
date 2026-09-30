import { createSqlClient } from '@nexus/db';

export const plusFeatures = {
  profileAnalytics: 'PROFILE_ANALYTICS',
  featuredProof: 'FEATURED_PROOF',
  priorityOutreach: 'PRIORITY_OUTREACH',
  emeraldSignal: 'EMERALD_SIGNAL',
  advancedMute: 'ADVANCED_MUTE',
} as const;

export type PlusFeature = (typeof plusFeatures)[keyof typeof plusFeatures];

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

export async function requireVouchNetPlus(userId: string, feature: PlusFeature): Promise<void> {
  if (!(await hasVouchNetPlus(userId))) throw new Error(`PLUS_REQUIRED:${feature}`);
}
