import 'server-only';
import { createSqlClient } from '@nexus/db';
import { databaseClient, recordAudit } from './build-notifications';
import {
  rankBuilders,
  rankOpportunities,
  selectProjectSections,
  type MomentumSignal,
  type ProjectSections,
  type RankedItem,
} from './discovery-ranking';
import { listOpportunities, type OpportunityRecord } from './opportunities';
import { normalizeProjectStatus, type ProjectStatus } from './project-model';
import { normalizeProfileIntent, type ProfileIntent } from './profile-intent';
import { getReputations } from './reputation';
import { findVouchedBuilders, topVouchedSkills, voucherCounts } from './vouch-graph';

const sql = () => databaseClient(createSqlClient);

export type DiscoverProject = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  status: ProjectStatus;
  openSource: boolean;
  lookingFor: string[];
  tags: string[];
  ownerName: string;
  ownerSlug: string;
  followerCount: number;
  contributorCount: number;
  createdAt: Date;
  statusChangedAt: Date;
  lastActivityAt: Date;
  signals: MomentumSignal[];
};

export type DiscoverBuilder = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  intent: ProfileIntent | null;
  buildLogs30d: number;
  activeProjects: number;
  acceptedContributions: number;
  reputationScore: number;
  reputationLevel: string;
  vouchers: number;
};

type ProjectRow = Omit<DiscoverProject, 'status' | 'signals'> & {
  status: string;
  followAt: string[];
  logAt: string[];
  contributorAt: string[];
  opportunityAt: string[];
};

/** The public-project boundary used across discovery: no private projects, never across a block. */
function publicProject(client: ReturnType<typeof sql>, viewerId: string | null) {
  return client`(
    p.visibility='PUBLIC' AND u.status='ACTIVE'
    AND (pr.visibility='PUBLIC' OR (${viewerId}::uuid IS NOT NULL AND pr.visibility='MEMBERS'))
    AND (${viewerId}::uuid IS NULL OR NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id=${viewerId}::uuid AND b.blocked_id=p.owner_id)
         OR (b.blocker_id=p.owner_id AND b.blocked_id=${viewerId}::uuid)))
  )`;
}

const toDates = (values: readonly string[], kind: MomentumSignal['kind']): MomentumSignal[] =>
  values.map((value) => ({ kind, at: new Date(value) }));

export async function listDiscoverProjects(viewerId: string | null): Promise<DiscoverProject[]> {
  const client = sql();
  try {
    const rows = await client<ProjectRow[]>`
      SELECT p.id,p.slug,p.name,p.summary,p.status,p.open_source AS "openSource",
        p.looking_for AS "lookingFor",pr.first_name || ' ' || pr.last_name AS "ownerName",
        pr.slug AS "ownerSlug",p.created_at AS "createdAt",p.status_changed_at AS "statusChangedAt",
        p.last_activity_at AS "lastActivityAt",
        COALESCE((SELECT array_agg(pt.tag ORDER BY pt.tag) FROM project_tags pt WHERE pt.project_id=p.id),'{}') AS tags,
        (SELECT count(*)::int FROM project_follows pf WHERE pf.project_id=p.id) AS "followerCount",
        (SELECT count(*)::int FROM project_contributors pc WHERE pc.project_id=p.id AND pc.status='ACCEPTED') AS "contributorCount",
        (SELECT COALESCE(json_agg(pf.created_at),'[]'::json) FROM project_follows pf
          WHERE pf.project_id=p.id AND pf.user_id<>p.owner_id AND pf.created_at > now() - interval '14 days') AS "followAt",
        (SELECT COALESCE(json_agg(l.created_at),'[]'::json) FROM project_build_logs l
          WHERE l.project_id=p.id AND l.deleted_at IS NULL AND l.moderated_at IS NULL
            AND l.created_at > now() - interval '14 days') AS "logAt",
        (SELECT COALESCE(json_agg(c.responded_at),'[]'::json) FROM project_contributors c
          WHERE c.project_id=p.id AND c.status='ACCEPTED' AND c.responded_at > now() - interval '14 days') AS "contributorAt",
        (SELECT COALESCE(json_agg(o.created_at),'[]'::json) FROM opportunities o
          WHERE o.project_id=p.id AND o.moderation_state='ACTIVE'
            AND o.created_at > now() - interval '14 days') AS "opportunityAt"
      FROM projects p
      JOIN users u ON u.id=p.owner_id
      JOIN profiles pr ON pr.user_id=p.owner_id
      WHERE ${publicProject(client, viewerId)} AND p.status<>'ARCHIVED'
      ORDER BY p.last_activity_at DESC,p.id
      LIMIT 200
    `;
    return rows.map(({ followAt, logAt, contributorAt, opportunityAt, ...row }) => ({
      ...row,
      status: normalizeProjectStatus(row.status),
      signals: [
        ...toDates(followAt, 'follow'),
        ...toDates(logAt, 'buildLog'),
        ...toDates(contributorAt, 'contributor'),
        ...toDates(opportunityAt, 'opportunity'),
      ],
    }));
  } finally {
    await client.end({ timeout: 1 });
  }
}

type BuilderRow = Omit<
  DiscoverBuilder,
  'intent' | 'reputationScore' | 'reputationLevel' | 'vouchers'
> & { intent: string | null };

/**
 * Members with recorded building activity on visible public projects: build-log entries in the
 * last 30 days, projects they maintain, and accepted contributions. The viewer is excluded.
 */
async function listBuilderCandidates(viewerId: string | null): Promise<BuilderRow[]> {
  const client = sql();
  try {
    return await client<BuilderRow[]>`
      WITH visible AS (
        SELECT p.id,p.owner_id FROM projects p
        JOIN users u ON u.id=p.owner_id
        JOIN profiles pr ON pr.user_id=p.owner_id
        WHERE ${publicProject(client, viewerId)} AND p.status<>'ARCHIVED'
      ),
      logs AS (
        SELECT l.author_id AS user_id,count(*)::int AS n FROM project_build_logs l
        JOIN visible v ON v.id=l.project_id
        WHERE l.deleted_at IS NULL AND l.moderated_at IS NULL AND l.created_at > now() - interval '30 days'
        GROUP BY l.author_id
      ),
      owned AS (SELECT owner_id AS user_id,count(*)::int AS n FROM visible GROUP BY owner_id),
      contributing AS (
        SELECT c.user_id,count(*)::int AS n FROM project_contributors c
        JOIN visible v ON v.id=c.project_id
        WHERE c.status='ACCEPTED'
        GROUP BY c.user_id
      ),
      people AS (
        SELECT user_id FROM logs UNION SELECT user_id FROM owned UNION SELECT user_id FROM contributing
      )
      SELECT pr.user_id AS id,pr.slug,pr.first_name || ' ' || pr.last_name AS name,pr.headline,
        pr.current_intent AS intent,COALESCE(logs.n,0) AS "buildLogs30d",
        COALESCE(owned.n,0) AS "activeProjects",COALESCE(contributing.n,0) AS "acceptedContributions"
      FROM people
      JOIN profiles pr ON pr.user_id=people.user_id
      JOIN users u ON u.id=pr.user_id
      LEFT JOIN logs ON logs.user_id=people.user_id
      LEFT JOIN owned ON owned.user_id=people.user_id
      LEFT JOIN contributing ON contributing.user_id=people.user_id
      WHERE u.status='ACTIVE'
        AND (pr.visibility='PUBLIC' OR (${viewerId}::uuid IS NOT NULL AND pr.visibility='MEMBERS'))
        AND (${viewerId}::uuid IS NULL OR (pr.user_id<>${viewerId}::uuid AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id=${viewerId}::uuid AND b.blocked_id=pr.user_id)
             OR (b.blocker_id=pr.user_id AND b.blocked_id=${viewerId}::uuid))))
      ORDER BY COALESCE(logs.n,0) DESC,pr.user_id
      LIMIT 200
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export type DiscoverData = {
  builders: RankedItem<DiscoverBuilder>[];
  projects: ProjectSections<DiscoverProject>;
  opportunities: RankedItem<OpportunityRecord>[];
  vouched: Awaited<ReturnType<typeof findVouchedBuilders>>;
  skills: { skill: string; vouchers: number }[];
};

/**
 * Everything on /discover, ranked with the explainable policies in discovery-ranking. Builders
 * are ranked by recent building first; participation reputation and distinct vouchers only
 * break ties, with vouchers capped so they never dominate.
 */
export async function getDiscoverData(input: {
  viewerId: string | null;
  intent: ProfileIntent | null;
  skill: string | null;
}): Promise<DiscoverData> {
  const now = new Date();
  const [projects, candidates, opportunities, vouched, skills] = await Promise.all([
    listDiscoverProjects(input.viewerId),
    listBuilderCandidates(input.viewerId),
    listOpportunities({ viewerId: input.viewerId, limit: 40 }),
    findVouchedBuilders({
      viewerId: input.viewerId,
      skill: input.skill ?? undefined,
      excludeUserId: input.viewerId ?? undefined,
      limit: 6,
    }),
    topVouchedSkills(10),
  ]);
  const people = candidates
    .map((row) => ({ ...row, intent: normalizeProfileIntent(row.intent) }))
    .filter((row) => input.intent === null || row.intent === input.intent);
  const ids = people.map((row) => row.id);
  const [reputations, vouchers] = await Promise.all([getReputations(ids), voucherCounts(ids)]);
  const builders = rankBuilders(
    people.map((row) => {
      const reputation = reputations.get(row.id);
      return {
        ...row,
        reputationScore: reputation?.score ?? 0,
        reputationLevel: reputation?.level ?? 'Newcomer',
        vouchers: vouchers.get(row.id) ?? 0,
      };
    }),
    6,
  );
  return {
    builders,
    projects: selectProjectSections(projects, now),
    opportunities: rankOpportunities(opportunities, now, 5),
    vouched,
    skills,
  };
}

export async function getProfileIntent(userId: string): Promise<ProfileIntent | null> {
  const client = sql();
  try {
    const [row] = await client<{ intent: string | null }[]>`
      SELECT current_intent AS intent FROM profiles WHERE user_id=${userId}
    `;
    return normalizeProfileIntent(row?.intent ?? null);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function setProfileIntent(
  userId: string,
  intent: ProfileIntent | null,
): Promise<ProfileIntent | null> {
  const client = sql();
  try {
    await client.begin(async (transaction) => {
      await transaction`
        UPDATE profiles SET current_intent=${intent},updated_at=now() WHERE user_id=${userId}
      `;
      await recordAudit(transaction, {
        actorId: userId,
        operation: intent === null ? 'PROFILE_INTENT_CLEARED' : 'PROFILE_INTENT_SET',
        resourceType: 'PROFILE',
        resourceId: userId,
        policy: 'ALLOW_OWNER',
      });
    });
    return intent;
  } finally {
    await client.end({ timeout: 1 });
  }
}
