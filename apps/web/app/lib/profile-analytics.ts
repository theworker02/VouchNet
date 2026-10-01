import 'server-only';
import { createSqlClient } from '@nexus/db';

type ProfileViewSource = 'DIRECT' | 'SEARCH' | 'NETWORK';

function client() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

/**
 * Only authenticated, non-self views are recorded. This deliberately excludes IP/device data,
 * anonymous traffic, and raw search terms from a professional profile's analytics.
 */
export async function recordProfileView(
  profileUserId: string,
  viewerUserId: string | null,
  source: ProfileViewSource = 'DIRECT',
): Promise<void> {
  if (viewerUserId === null || viewerUserId === profileUserId) return;
  const sql = client();
  try {
    await sql`
      INSERT INTO profile_view_events (profile_user_id,viewer_user_id,source)
      VALUES (${profileUserId},${viewerUserId},${source})
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export type ProfileAnalytics = {
  viewsLast30Days: number;
  viewersLast30Days: number;
  viewsLast90Days: number;
  recentViewers: {
    fullName: string;
    headline: string | null;
    viewedAt: Date;
    source: ProfileViewSource;
  }[];
};

export async function getProfileAnalytics(userId: string): Promise<ProfileAnalytics> {
  const sql = client();
  try {
    const [aggregate] = await sql<{ views30: number; viewers30: number; views90: number }[]>`
      SELECT
        COUNT(*) FILTER (WHERE viewed_at >= now() - interval '30 days')::integer AS "views30",
        COUNT(DISTINCT viewer_user_id) FILTER (WHERE viewed_at >= now() - interval '30 days')::integer AS "viewers30",
        COUNT(*) FILTER (WHERE viewed_at >= now() - interval '90 days')::integer AS "views90"
      FROM profile_view_events
      WHERE profile_user_id=${userId} AND viewed_at >= now() - interval '90 days'
    `;
    const recentViewers = await sql<
      {
        fullName: string;
        headline: string | null;
        viewedAt: Date;
        source: ProfileViewSource;
      }[]
    >`
      SELECT concat(p.first_name,' ',p.last_name) AS "fullName",p.headline,
        e.viewed_at AS "viewedAt",e.source
      FROM profile_view_events e
      JOIN profiles p ON p.user_id=e.viewer_user_id
      WHERE e.profile_user_id=${userId}
        AND e.viewer_user_id IS NOT NULL
        AND e.viewed_at >= now() - interval '90 days'
      ORDER BY e.viewed_at DESC
      LIMIT 100
    `;
    return {
      viewsLast30Days: aggregate?.views30 ?? 0,
      viewersLast30Days: aggregate?.viewers30 ?? 0,
      viewsLast90Days: aggregate?.views90 ?? 0,
      recentViewers,
    };
  } finally {
    await sql.end({ timeout: 1 });
  }
}
