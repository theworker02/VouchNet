import 'server-only';
import { createSqlClient } from '@nexus/db';
import { recommendPeople, type PersonCandidate } from '@nexus/recommendations';

function client() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}
export async function discoverPeople(userId: string) {
  const sql = client();
  try {
    const rows = await sql<
      {
        user_id: string;
        slug: string;
        first_name: string;
        last_name: string;
        headline: string | null;
        mutual_contacts: number;
      }[]
    >`
      WITH direct_contacts AS (
        SELECT CASE WHEN requester_id=${userId} THEN recipient_id ELSE requester_id END AS user_id FROM connections WHERE state='ACCEPTED' AND (${userId} IN (requester_id,recipient_id))
      ), candidates AS (
        SELECT CASE WHEN c.requester_id=d.user_id THEN c.recipient_id ELSE c.requester_id END AS user_id FROM connections c JOIN direct_contacts d ON d.user_id IN (c.requester_id,c.recipient_id) WHERE c.state='ACCEPTED'
      )
      SELECT p.user_id,p.slug,p.first_name,p.last_name,p.headline,COUNT(*)::int AS mutual_contacts FROM candidates x JOIN profiles p ON p.user_id=x.user_id JOIN users u ON u.id=x.user_id WHERE x.user_id<>${userId} AND p.visibility IN ('PUBLIC','MEMBERS') AND u.status='ACTIVE' AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${userId} AND b.blocked_id=x.user_id) OR (b.blocker_id=x.user_id AND b.blocked_id=${userId})) AND NOT EXISTS (SELECT 1 FROM connections existing WHERE existing.pair_low_id=LEAST(${userId}::uuid,x.user_id) AND existing.pair_high_id=GREATEST(${userId}::uuid,x.user_id)) AND NOT EXISTS (SELECT 1 FROM recommendation_feedback f WHERE f.user_id=${userId} AND f.entity_type='PERSON' AND f.entity_id=x.user_id) GROUP BY p.user_id,p.slug,p.first_name,p.last_name,p.headline`;
    const scores = recommendPeople(
      rows.map((row): PersonCandidate => ({
        userId: row.user_id,
        active: true,
        blocked: false,
        alreadyContact: false,
        alreadyFollowed: false,
        dismissed: false,
        mutualContacts: row.mutual_contacts,
        sharedSkills: 0,
        interactionAffinity: 0,
      })),
    );
    return scores
      .map((score) => {
        const profile = rows.find((row) => row.user_id === score.userId);
        return profile === undefined
          ? null
          : { ...profile, score: score.score, reasons: score.reasons };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);
  } finally {
    await sql.end({ timeout: 1 });
  }
}
export async function saveRecommendationFeedback(
  userId: string,
  candidateId: string,
  feedback: 'DISMISSED' | 'NOT_INTERESTED' | 'ALREADY_KNOW' | 'DO_NOT_SUGGEST',
) {
  const sql = client();
  try {
    await sql`INSERT INTO recommendation_feedback (user_id,entity_type,entity_id,feedback) VALUES (${userId},'PERSON',${candidateId},${feedback}) ON CONFLICT (user_id,entity_type,entity_id) DO UPDATE SET feedback=EXCLUDED.feedback,created_at=now()`;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
