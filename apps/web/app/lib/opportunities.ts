import 'server-only';
import { createSqlClient } from '@nexus/db';
import {
  DomainError,
  databaseClient,
  notifyMember,
  recordAudit,
  type Transaction,
} from './build-notifications';
import {
  canChangeOpportunityStatus,
  evaluateProposal,
  isPastDeadline,
  nextProposalStatus,
  opportunityLimits,
  type OpportunityInput,
  type OpportunityStatus,
  type OpportunityType,
  type ProposalAction,
  type ProposalInput,
  type ProposalStatus,
} from './opportunity-model';
import { getReputations } from './reputation';
import { voucherCounts } from './vouch-graph';

export type OpportunityPerson = {
  userId: string;
  slug: string;
  name: string;
  headline: string | null;
};

export type OpportunityRecord = {
  id: string;
  slug: string;
  type: OpportunityType;
  title: string;
  summary: string;
  description: string;
  lookingFor: string;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetCurrency: string;
  deadline: string | null;
  location: string | null;
  remote: boolean;
  proposalsOpen: boolean;
  tags: string[];
  status: OpportunityStatus;
  moderationState: 'ACTIVE' | 'UNDER_REVIEW' | 'REMOVED';
  createdAt: Date;
  poster: OpportunityPerson;
  project: { id: string; slug: string; name: string } | null;
  proposalCount: number;
};

export type ProposalRecord = {
  id: string;
  status: ProposalStatus;
  message: string;
  proposedBudget: number | null;
  timeline: string | null;
  portfolioUrl: string | null;
  createdAt: Date;
  proposer: OpportunityPerson;
  project: { slug: string; name: string } | null;
  /** Verifiable context for the poster: people who vouch for the proposer, and their level. */
  voucherCount: number;
  reputationLevel: string;
};

export type OpportunityDetail = OpportunityRecord & {
  viewer: {
    userId: string | null;
    role: 'POSTER' | 'MEMBER' | 'ANONYMOUS';
    ownProposal: { id: string; status: ProposalStatus; createdAt: Date } | null;
    /** Why the viewer cannot send a proposal right now, if they cannot. */
    proposalDenial: string | null;
  };
  proposals: ProposalRecord[];
};

const sql = () => databaseClient(createSqlClient);
type Client = ReturnType<typeof sql> | Transaction;

function opportunityColumns(client: Client) {
  return client`
    o.id,o.slug,o.type,o.title,o.summary,o.description,o.looking_for AS "lookingFor",
    o.budget_min AS "budgetMin",o.budget_max AS "budgetMax",o.budget_currency AS "budgetCurrency",
    to_char(o.deadline,'YYYY-MM-DD') AS deadline,o.location,o.remote,o.proposals_open AS "proposalsOpen",
    o.tags,o.status,o.moderation_state AS "moderationState",o.created_at AS "createdAt",
    json_build_object('userId',pr.user_id,'slug',pr.slug,'name',pr.first_name || ' ' || pr.last_name,
      'headline',pr.headline) AS poster,
    CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object('id',p.id,'slug',p.slug,'name',p.name) END AS project,
    (SELECT count(*)::int FROM opportunity_proposals op
      WHERE op.opportunity_id=o.id AND op.status<>'WITHDRAWN') AS "proposalCount"
  `;
}

function opportunityJoins(client: Client) {
  return client`
    FROM opportunities o
    JOIN profiles pr ON pr.user_id=o.poster_id
    JOIN users u ON u.id=o.poster_id
    LEFT JOIN projects p ON p.id=o.project_id AND p.visibility='PUBLIC'
  `;
}

/**
 * Same boundary as projects: an ACTIVE poster with a PUBLIC profile (or MEMBERS, for signed-in
 * viewers), never across a block, and never once moderation removed it. Posters always see theirs.
 */
function visibleTo(client: Client, viewerId: string | null) {
  return client`(
    o.poster_id=${viewerId}::uuid
    OR (o.moderation_state='ACTIVE' AND u.status='ACTIVE'
      AND (pr.visibility='PUBLIC' OR (${viewerId}::uuid IS NOT NULL AND pr.visibility='MEMBERS'))
      AND (${viewerId}::uuid IS NULL OR NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id=${viewerId}::uuid AND b.blocked_id=o.poster_id)
           OR (b.blocker_id=o.poster_id AND b.blocked_id=${viewerId}::uuid))))
  )`;
}

function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70)
    .replace(/-$/, '');
}

/** Open, unexpired opportunities, newest first. */
export async function listOpportunities(input: {
  viewerId: string | null;
  type?: OpportunityType | null | undefined;
  q?: string | null | undefined;
  remoteOnly?: boolean | undefined;
  limit?: number | undefined;
}): Promise<OpportunityRecord[]> {
  const client = sql();
  try {
    const type = input.type ?? null;
    const pattern = input.q === null || input.q === undefined ? null : likePattern(input.q);
    return await client<OpportunityRecord[]>`
      SELECT ${opportunityColumns(client)} ${opportunityJoins(client)}
      WHERE o.status='OPEN' AND o.moderation_state='ACTIVE'
        AND (o.deadline IS NULL OR o.deadline >= CURRENT_DATE)
        AND ${visibleTo(client, input.viewerId)}
        AND (${type}::text IS NULL OR o.type=${type})
        AND (${input.remoteOnly === true} = false OR o.remote)
        AND (${pattern}::text IS NULL OR o.title ILIKE ${pattern} OR o.summary ILIKE ${pattern}
          OR o.looking_for ILIKE ${pattern} OR EXISTS (SELECT 1 FROM unnest(o.tags) t WHERE t ILIKE ${pattern}))
      ORDER BY o.created_at DESC
      LIMIT ${Math.min(Math.max(input.limit ?? 50, 1), 100)}
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function listOwnOpportunities(
  posterId: string,
): Promise<(OpportunityRecord & { newProposals: number })[]> {
  const client = sql();
  try {
    return await client<(OpportunityRecord & { newProposals: number })[]>`
      SELECT ${opportunityColumns(client)},
        (SELECT count(*)::int FROM opportunity_proposals op
          WHERE op.opportunity_id=o.id AND op.status='SUBMITTED') AS "newProposals"
      ${opportunityJoins(client)}
      WHERE o.poster_id=${posterId}
      ORDER BY (o.status='OPEN') DESC, o.created_at DESC
      LIMIT 100
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export type OwnProposal = {
  id: string;
  status: ProposalStatus;
  createdAt: Date;
  opportunity: {
    id: string;
    slug: string;
    title: string;
    type: OpportunityType;
    status: OpportunityStatus;
    posterName: string;
  };
};

export async function listOwnProposals(userId: string): Promise<OwnProposal[]> {
  const client = sql();
  try {
    return await client<OwnProposal[]>`
      SELECT op.id,op.status,op.created_at AS "createdAt",
        json_build_object('id',o.id,'slug',o.slug,'title',o.title,'type',o.type,'status',o.status,
          'posterName',pr.first_name || ' ' || pr.last_name) AS opportunity
      FROM opportunity_proposals op
      JOIN opportunities o ON o.id=op.opportunity_id
      JOIN profiles pr ON pr.user_id=o.poster_id
      WHERE op.proposer_id=${userId} AND o.moderation_state<>'REMOVED'
      ORDER BY op.created_at DESC
      LIMIT 100
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function getOpportunityDetail(
  slug: string,
  viewerId: string | null,
): Promise<OpportunityDetail | null> {
  const client = sql();
  try {
    const rows = await client<OpportunityRecord[]>`
      SELECT ${opportunityColumns(client)} ${opportunityJoins(client)}
      WHERE o.slug=${slug} AND ${visibleTo(client, viewerId)}
    `;
    const opportunity = rows[0];
    if (opportunity === undefined) return null;
    const isPoster = viewerId !== null && opportunity.poster.userId === viewerId;
    let ownProposal: OpportunityDetail['viewer']['ownProposal'] = null;
    let proposalDenial: string | null = null;
    let proposals: ProposalRecord[] = [];
    if (viewerId !== null && !isPoster) {
      const [own, today] = await Promise.all([
        client<{ id: string; status: ProposalStatus; createdAt: Date }[]>`
          SELECT id,status,created_at AS "createdAt" FROM opportunity_proposals
          WHERE opportunity_id=${opportunity.id} AND proposer_id=${viewerId}
        `,
        client<{ count: number }[]>`
          SELECT count(*)::int AS count FROM opportunity_proposals
          WHERE proposer_id=${viewerId} AND created_at > now() - interval '1 day'
        `,
      ]);
      ownProposal = own[0] ?? null;
      const decision = evaluateProposal({
        actorId: viewerId,
        posterId: opportunity.poster.userId,
        status: opportunity.status,
        proposalsOpen: opportunity.proposalsOpen,
        deadline: opportunity.deadline,
        alreadyProposed: ownProposal !== null,
        blocked: false,
        proposalsToday: today[0]?.count ?? 0,
      });
      proposalDenial = decision.allowed ? null : decision.code;
    }
    if (isPoster) {
      const proposalRows = await client<Omit<ProposalRecord, 'voucherCount' | 'reputationLevel'>[]>`
        SELECT op.id,op.status,op.message,op.proposed_budget AS "proposedBudget",op.timeline,
          op.portfolio_url AS "portfolioUrl",op.created_at AS "createdAt",
          json_build_object('userId',pr.user_id,'slug',pr.slug,'name',pr.first_name || ' ' || pr.last_name,
            'headline',pr.headline) AS proposer,
          CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object('slug',p.slug,'name',p.name) END AS project
        FROM opportunity_proposals op
        JOIN profiles pr ON pr.user_id=op.proposer_id
        LEFT JOIN projects p ON p.id=op.project_id AND p.visibility='PUBLIC'
        WHERE op.opportunity_id=${opportunity.id}
        ORDER BY CASE op.status WHEN 'SHORTLISTED' THEN 0 WHEN 'SUBMITTED' THEN 1 WHEN 'ACCEPTED' THEN 2
          WHEN 'DECLINED' THEN 3 ELSE 4 END, op.created_at ASC
        LIMIT 200
      `;
      const ids = proposalRows.map((row) => row.proposer.userId);
      const [counts, reputations] = await Promise.all([voucherCounts(ids), getReputations(ids)]);
      proposals = proposalRows.map((row) => ({
        ...row,
        voucherCount: counts.get(row.proposer.userId) ?? 0,
        reputationLevel: reputations.get(row.proposer.userId)?.level ?? 'Newcomer',
      }));
    }
    return {
      ...opportunity,
      viewer: {
        userId: viewerId,
        role: viewerId === null ? 'ANONYMOUS' : isPoster ? 'POSTER' : 'MEMBER',
        ownProposal,
        proposalDenial,
      },
      proposals,
    };
  } finally {
    await client.end({ timeout: 1 });
  }
}

async function assertOwnProject(client: Transaction, userId: string, projectId: string | null) {
  if (projectId === null) return;
  const rows = await client<{ ok: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM projects p WHERE p.id=${projectId} AND (p.owner_id=${userId}
      OR EXISTS (SELECT 1 FROM project_contributors c WHERE c.project_id=p.id AND c.user_id=${userId}
        AND c.status='ACCEPTED'))) AS ok
  `;
  if (rows[0]?.ok !== true) throw new DomainError('PROJECT_NOT_YOURS');
}

export async function createOpportunity(
  posterId: string,
  input: OpportunityInput,
): Promise<{ id: string; slug: string }> {
  if (isPastDeadline(input.deadline)) throw new DomainError('DEADLINE_IN_PAST', 400);
  const client = sql();
  const slug = `${makeSlug(input.title) || 'opportunity'}-${crypto.randomUUID().slice(0, 8)}`;
  try {
    return await client.begin(async (transaction) => {
      // Serialize a member's posts so the daily limit cannot be raced.
      await transaction`SELECT pg_advisory_xact_lock(hashtext(${`opportunity-post:${posterId}`}))`;
      const recent = await transaction<{ count: number }[]>`
        SELECT count(*)::int AS count FROM opportunities
        WHERE poster_id=${posterId} AND created_at > now() - interval '1 day'
      `;
      if ((recent[0]?.count ?? 0) >= opportunityLimits.postsPerDay)
        throw new DomainError('POST_RATE_LIMITED', 429);
      await assertOwnProject(transaction, posterId, input.projectId);
      const rows = await transaction<{ id: string }[]>`
        INSERT INTO opportunities (slug,poster_id,project_id,type,title,summary,description,looking_for,
          budget_min,budget_max,budget_currency,deadline,location,remote,proposals_open,tags)
        VALUES (${slug},${posterId},${input.projectId},${input.type},${input.title},${input.summary},
          ${input.description},${input.lookingFor},${input.budgetMin},${input.budgetMax},
          ${input.budgetCurrency},${input.deadline},${input.location},${input.remote},
          ${input.proposalsOpen},${input.tags})
        RETURNING id
      `;
      const id = rows[0]?.id;
      if (id === undefined) throw new Error('OPPORTUNITY_CREATION_FAILED');
      await recordAudit(transaction, {
        actorId: posterId,
        operation: 'OPPORTUNITY_CREATED',
        resourceType: 'OPPORTUNITY',
        resourceId: id,
        policy: 'ALLOW_MEMBER',
      });
      return { id, slug };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

async function lockOwnOpportunity(client: Transaction, actorId: string, opportunityId: string) {
  const rows = await client<
    {
      posterId: string;
      slug: string;
      title: string;
      status: OpportunityStatus;
      moderationState: string;
    }[]
  >`
    SELECT poster_id AS "posterId",slug,title,status,moderation_state AS "moderationState"
    FROM opportunities WHERE id=${opportunityId} FOR UPDATE
  `;
  const opportunity = rows[0];
  if (opportunity === undefined) throw new DomainError('OPPORTUNITY_UNAVAILABLE', 404);
  if (opportunity.posterId !== actorId) throw new DomainError('POSTER_REQUIRED');
  if (opportunity.moderationState === 'REMOVED') throw new DomainError('OPPORTUNITY_REMOVED', 409);
  return opportunity;
}

/** A full replacement edit by the poster; the slug stays stable so shared links keep working. */
export async function updateOpportunity(
  actorId: string,
  opportunityId: string,
  input: OpportunityInput,
): Promise<{ slug: string }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const opportunity = await lockOwnOpportunity(transaction, actorId, opportunityId);
      await assertOwnProject(transaction, actorId, input.projectId);
      await transaction`
        UPDATE opportunities SET project_id=${input.projectId},type=${input.type},title=${input.title},
          summary=${input.summary},description=${input.description},looking_for=${input.lookingFor},
          budget_min=${input.budgetMin},budget_max=${input.budgetMax},budget_currency=${input.budgetCurrency},
          deadline=${input.deadline},location=${input.location},remote=${input.remote},
          proposals_open=${input.proposalsOpen},tags=${input.tags},updated_at=now()
        WHERE id=${opportunityId}
      `;
      await recordAudit(transaction, {
        actorId,
        operation: 'OPPORTUNITY_UPDATED',
        resourceType: 'OPPORTUNITY',
        resourceId: opportunityId,
        policy: 'ALLOW_POSTER',
      });
      return { slug: opportunity.slug };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function changeOpportunityStatus(
  actorId: string,
  opportunityId: string,
  status: OpportunityStatus,
): Promise<{ status: OpportunityStatus }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const opportunity = await lockOwnOpportunity(transaction, actorId, opportunityId);
      if (!canChangeOpportunityStatus(opportunity.status, status))
        throw new DomainError('STATUS_CHANGE_NOT_ALLOWED', 409);
      await transaction`
        UPDATE opportunities SET status=${status},updated_at=now(),
          closed_at=CASE WHEN ${status}='OPEN' THEN NULL ELSE now() END
        WHERE id=${opportunityId}
      `;
      if (status !== 'OPEN') {
        // Tell people still waiting on a decision, once, so nobody is left guessing.
        await transaction`
          INSERT INTO member_notifications (user_id,category,resource_key,title,body,href)
          SELECT op.proposer_id,'BUILD_IN_PUBLIC',${`opportunity-status:${opportunityId}`},
            ${`${opportunity.title} is no longer open`.slice(0, 160)},
            ${'The poster closed this opportunity. Your proposal stays on record.'},
            ${`/opportunities/${opportunity.slug}`}
          FROM opportunity_proposals op
          WHERE op.opportunity_id=${opportunityId} AND op.status IN ('SUBMITTED','SHORTLISTED')
          LIMIT 200
          ON CONFLICT (user_id,category,resource_key) DO UPDATE
            SET title=EXCLUDED.title,body=EXCLUDED.body,href=EXCLUDED.href,read_at=NULL,created_at=now()
        `;
      }
      await recordAudit(transaction, {
        actorId,
        operation: `OPPORTUNITY_${status}`,
        resourceType: 'OPPORTUNITY',
        resourceId: opportunityId,
        policy: 'ALLOW_POSTER',
      });
      return { status };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

/** Moderators remove or restore an opportunity; the route checks the moderator role first. */
export async function moderateOpportunity(
  moderatorId: string,
  opportunityId: string,
  remove: boolean,
): Promise<{ moderationState: 'ACTIVE' | 'REMOVED' }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const rows = await transaction<{ id: string }[]>`
        UPDATE opportunities SET moderation_state=${remove ? 'REMOVED' : 'ACTIVE'},updated_at=now()
        WHERE id=${opportunityId} RETURNING id
      `;
      if (rows[0] === undefined) throw new DomainError('OPPORTUNITY_UNAVAILABLE', 404);
      await recordAudit(transaction, {
        actorId: moderatorId,
        operation: remove ? 'OPPORTUNITY_MODERATED_REMOVE' : 'OPPORTUNITY_MODERATED_RESTORE',
        resourceType: 'OPPORTUNITY',
        resourceId: opportunityId,
        policy: 'ALLOW_MODERATOR',
      });
      return { moderationState: remove ? 'REMOVED' : 'ACTIVE' };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

const denialStatus: Record<string, number> = {
  CANNOT_PROPOSE_TO_OWN: 403,
  BLOCKED_RELATIONSHIP: 403,
  OPPORTUNITY_CLOSED: 409,
  PROPOSALS_CLOSED: 409,
  DEADLINE_PASSED: 409,
  ALREADY_PROPOSED: 409,
  PROPOSAL_RATE_LIMITED: 429,
};

export async function submitProposal(
  actorId: string,
  opportunityId: string,
  input: ProposalInput,
): Promise<{ id: string }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(hashtext(${`opportunity-proposal:${actorId}`}))`;
      const rows = await transaction<
        {
          posterId: string;
          slug: string;
          title: string;
          status: OpportunityStatus;
          proposalsOpen: boolean;
          deadline: string | null;
          blocked: boolean;
        }[]
      >`
        SELECT o.poster_id AS "posterId",o.slug,o.title,o.status,o.proposals_open AS "proposalsOpen",
          to_char(o.deadline,'YYYY-MM-DD') AS deadline,
          EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${actorId} AND b.blocked_id=o.poster_id)
            OR (b.blocker_id=o.poster_id AND b.blocked_id=${actorId})) AS blocked
        ${opportunityJoins(transaction)}
        WHERE o.id=${opportunityId} AND o.moderation_state='ACTIVE' AND u.status='ACTIVE'
          AND pr.visibility IN ('PUBLIC','MEMBERS')
        FOR UPDATE OF o
      `;
      const opportunity = rows[0];
      if (opportunity === undefined) throw new DomainError('OPPORTUNITY_UNAVAILABLE', 404);
      const [existing, today] = await Promise.all([
        transaction<{ id: string }[]>`
          SELECT id FROM opportunity_proposals WHERE opportunity_id=${opportunityId} AND proposer_id=${actorId}
        `,
        transaction<{ count: number }[]>`
          SELECT count(*)::int AS count FROM opportunity_proposals
          WHERE proposer_id=${actorId} AND created_at > now() - interval '1 day'
        `,
      ]);
      const decision = evaluateProposal({
        actorId,
        posterId: opportunity.posterId,
        status: opportunity.status,
        proposalsOpen: opportunity.proposalsOpen,
        deadline: opportunity.deadline,
        alreadyProposed: existing.length > 0,
        blocked: opportunity.blocked,
        proposalsToday: today[0]?.count ?? 0,
      });
      if (!decision.allowed)
        throw new DomainError(
          decision.code === 'BLOCKED_RELATIONSHIP' ? 'OPPORTUNITY_UNAVAILABLE' : decision.code,
          decision.code === 'BLOCKED_RELATIONSHIP' ? 404 : (denialStatus[decision.code] ?? 409),
        );
      await assertOwnProject(transaction, actorId, input.projectId);
      const inserted = await transaction<{ id: string }[]>`
        INSERT INTO opportunity_proposals (opportunity_id,proposer_id,message,proposed_budget,timeline,
          portfolio_url,project_id)
        VALUES (${opportunityId},${actorId},${input.message},${input.proposedBudget},${input.timeline},
          ${input.portfolioUrl},${input.projectId})
        RETURNING id
      `;
      const id = inserted[0]?.id;
      if (id === undefined) throw new Error('PROPOSAL_FAILED');
      const names = await transaction<{ name: string }[]>`
        SELECT first_name || ' ' || last_name AS name FROM profiles WHERE user_id=${actorId}
      `;
      await notifyMember(transaction, {
        userId: opportunity.posterId,
        resourceKey: `opportunity-proposals:${opportunityId}`,
        title: `New proposal on ${opportunity.title}`,
        body: `${names[0]?.name ?? 'A member'} sent a proposal.`,
        href: `/opportunities/${opportunity.slug}#proposals`,
      });
      await recordAudit(transaction, {
        actorId,
        operation: 'OPPORTUNITY_PROPOSAL_SUBMITTED',
        resourceType: 'OPPORTUNITY_PROPOSAL',
        resourceId: id,
        policy: 'ALLOW_MEMBER',
      });
      return { id };
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505')
      throw new DomainError('ALREADY_PROPOSED', 409);
    throw error;
  } finally {
    await client.end({ timeout: 1 });
  }
}

const proposalNotice: Partial<Record<ProposalStatus, string>> = {
  SHORTLISTED: 'Your proposal was shortlisted',
  ACCEPTED: 'Your proposal was accepted',
  DECLINED: 'Your proposal was declined',
};

export async function updateProposal(
  actorId: string,
  opportunityId: string,
  proposalId: string,
  action: ProposalAction,
): Promise<{ status: ProposalStatus }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const rows = await transaction<
        {
          proposerId: string;
          posterId: string;
          status: ProposalStatus;
          slug: string;
          title: string;
        }[]
      >`
        SELECT op.proposer_id AS "proposerId",o.poster_id AS "posterId",op.status,o.slug,o.title
        FROM opportunity_proposals op JOIN opportunities o ON o.id=op.opportunity_id
        WHERE op.id=${proposalId} AND op.opportunity_id=${opportunityId}
        FOR UPDATE OF op
      `;
      const proposal = rows[0];
      const actorIsPoster = proposal?.posterId === actorId;
      const actorIsProposer = proposal?.proposerId === actorId;
      if (proposal === undefined || (!actorIsPoster && !actorIsProposer))
        throw new DomainError('PROPOSAL_UNAVAILABLE', 404);
      const next = nextProposalStatus({
        action,
        current: proposal.status,
        actorIsPoster,
        actorIsProposer,
      });
      if (next === null) throw new DomainError('PROPOSAL_ACTION_NOT_ALLOWED', 409);
      await transaction`
        UPDATE opportunity_proposals SET status=${next},updated_at=now() WHERE id=${proposalId}
      `;
      const notice = proposalNotice[next];
      if (actorIsPoster && notice !== undefined)
        await notifyMember(transaction, {
          userId: proposal.proposerId,
          resourceKey: `opportunity-proposal:${proposalId}`,
          title: notice,
          body: proposal.title,
          href: `/opportunities/${proposal.slug}`,
        });
      await recordAudit(transaction, {
        actorId,
        operation: `OPPORTUNITY_PROPOSAL_${next}`,
        resourceType: 'OPPORTUNITY_PROPOSAL',
        resourceId: proposalId,
        policy: actorIsPoster ? 'ALLOW_POSTER' : 'ALLOW_PROPOSER',
      });
      return { status: next };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}
