import 'server-only';
import { createSqlClient } from '@nexus/db';
import {
  DomainError,
  databaseClient,
  notifyMember,
  recordAudit,
  type Sql,
  type Transaction,
} from './build-notifications';
import {
  canPerformVouchAction,
  canViewVouch,
  computeVerificationLevel,
  evaluateVouchEligibility,
  isReciprocalPattern,
  provenanceSignals,
  relationshipLabels,
  type VerificationEvidence,
  type VerificationLevel,
  type VouchAction,
  type VouchDenial,
  type VouchInput,
  type VouchRelationship,
  type VouchVisibility,
} from './vouch-model';

export type VouchPerson = {
  userId: string;
  slug: string;
  name: string;
  firstName: string;
  lastName: string;
  headline: string | null;
};

export type VouchContext = {
  type: 'PROJECT' | 'ORGANIZATION';
  id: string;
  name: string;
  href: string | null;
};

export type WorkVouch = {
  id: string;
  author: VouchPerson;
  recipient: VouchPerson;
  relationship: VouchRelationship;
  context: VouchContext | null;
  workedTogetherYear: number;
  skills: string[];
  statement: string;
  visibility: VouchVisibility;
  verificationLevel: VerificationLevel;
  evidence: VerificationEvidence[];
  createdAt: Date;
  editedAt: Date | null;
  hidden: boolean;
  moderationState: 'ACTIVE' | 'UNDER_REVIEW' | 'REMOVED';
};

export type VouchRevision = { change: string; createdAt: Date; editorName: string };

export type VouchDetail = WorkVouch & {
  revisions: VouchRevision[];
  provenance: string[];
  viewerActions: VouchAction[];
};

const sql = () => databaseClient(createSqlClient);

function vouchSelect(client: Sql) {
  return client`
    v.id,
    json_build_object('userId',ap.user_id,'slug',ap.slug,'name',ap.first_name || ' ' || ap.last_name,
      'firstName',ap.first_name,'lastName',ap.last_name,'headline',ap.headline) AS author,
    json_build_object('userId',rp.user_id,'slug',rp.slug,'name',rp.first_name || ' ' || rp.last_name,
      'firstName',rp.first_name,'lastName',rp.last_name,'headline',rp.headline) AS recipient,
    v.relationship,
    CASE
      WHEN v.context_type='PROJECT' THEN json_build_object('type','PROJECT','id',cp.id,'name',cp.name,
        'href',CASE WHEN cp.visibility='PUBLIC' THEN '/projects/' || cp.slug ELSE NULL END)
      WHEN v.context_type='ORGANIZATION' THEN json_build_object('type','ORGANIZATION','id',co.id,
        'name',co.name,'href','/company/' || co.slug)
      ELSE NULL END AS context,
    v.worked_together_year AS "workedTogetherYear",v.skills,v.statement,v.visibility,
    v.verification_level AS "verificationLevel",v.verification_evidence AS evidence,
    v.created_at AS "createdAt",v.edited_at AS "editedAt",
    (v.hidden_by_recipient_at IS NOT NULL) AS hidden,v.moderation_state AS "moderationState"
  `;
}

function vouchJoins(client: Sql) {
  return client`
    FROM work_vouches v
    JOIN profiles ap ON ap.user_id=v.author_id
    JOIN profiles rp ON rp.user_id=v.recipient_id
    JOIN users au ON au.id=v.author_id
    LEFT JOIN projects cp ON v.context_type='PROJECT' AND cp.id=v.context_id
    LEFT JOIN organizations co ON v.context_type='ORGANIZATION' AND co.id=v.context_id
  `;
}

/**
 * Viewer filter shared by every read: visibility, recipient hiding, moderation, inactive authors,
 * and blocks. Authors and recipients always see their own vouches so they can manage them.
 */
function viewerFilter(client: Sql, viewerId: string | null) {
  return client`(
    v.revoked_at IS NULL AND (
      v.author_id=${viewerId}::uuid OR v.recipient_id=${viewerId}::uuid OR (
        au.status='ACTIVE' AND v.moderation_state='ACTIVE' AND v.hidden_by_recipient_at IS NULL
        AND (v.visibility='PUBLIC' OR (v.visibility='MEMBERS' AND ${viewerId}::uuid IS NOT NULL))
        AND (${viewerId}::uuid IS NULL OR NOT EXISTS (SELECT 1 FROM blocks b
          WHERE (b.blocker_id=${viewerId}::uuid AND b.blocked_id IN (v.author_id,v.recipient_id))
             OR (b.blocked_id=${viewerId}::uuid AND b.blocker_id IN (v.author_id,v.recipient_id))))
      )
    )
  )`;
}

export async function listReceivedVouches(
  recipientId: string,
  viewerId: string | null,
): Promise<WorkVouch[]> {
  const client = sql();
  try {
    return await client<WorkVouch[]>`
      SELECT ${vouchSelect(client)} ${vouchJoins(client)}
      WHERE v.recipient_id=${recipientId} AND ${viewerFilter(client, viewerId)}
      ORDER BY v.created_at DESC
      LIMIT 100
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function listGivenVouches(
  authorId: string,
  viewerId: string | null,
): Promise<WorkVouch[]> {
  const client = sql();
  try {
    return await client<WorkVouch[]>`
      SELECT ${vouchSelect(client)} ${vouchJoins(client)}
      WHERE v.author_id=${authorId} AND ${viewerFilter(client, viewerId)}
      ORDER BY v.created_at DESC
      LIMIT 100
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function getVouchDetail(
  vouchId: string,
  viewerId: string | null,
  isModerator = false,
): Promise<VouchDetail | null> {
  const client = sql();
  try {
    const rows = await client<(WorkVouch & { authorSince: Date; reciprocal: boolean })[]>`
      SELECT ${vouchSelect(client)},au.created_at AS "authorSince",
        (v.reciprocal_signal_at IS NOT NULL) AS reciprocal
      ${vouchJoins(client)}
      WHERE v.id=${vouchId} AND (${viewerFilter(client, viewerId)}
        OR (${isModerator} AND v.revoked_at IS NULL))
    `;
    const row = rows[0];
    if (row === undefined) return null;
    const revisions = await client<VouchRevision[]>`
      SELECT r.change,r.created_at AS "createdAt",p.first_name || ' ' || p.last_name AS "editorName"
      FROM work_vouch_revisions r JOIN profiles p ON p.user_id=r.editor_id
      WHERE r.vouch_id=${vouchId} AND r.change IN ('CREATED','EDITED')
      ORDER BY r.created_at ASC
    `;
    const { authorSince, reciprocal, ...vouch } = row;
    const actions: VouchAction[] =
      viewerId === null
        ? []
        : (['EDIT', 'REVOKE', 'HIDE', 'UNHIDE', 'REPORT', 'MODERATE'] as const).filter((action) => {
            if (action === 'HIDE' && vouch.hidden) return false;
            if (action === 'UNHIDE' && !vouch.hidden) return false;
            return canPerformVouchAction({
              action,
              actorId: viewerId,
              authorId: vouch.author.userId,
              recipientId: vouch.recipient.userId,
              revoked: false,
              isModerator,
            });
          });
    return {
      ...vouch,
      revisions,
      provenance: provenanceSignals({
        evidence: vouch.evidence,
        authorMemberSince: new Date(authorSince),
        reciprocalFlagged: isModerator ? reciprocal : null,
      }),
      viewerActions: actions,
    };
  } finally {
    await client.end({ timeout: 1 });
  }
}

type EvidenceResult = {
  evidence: VerificationEvidence[];
  connected: boolean;
  sharedContext: boolean;
  contextRejected: boolean;
};

/** Gathers only facts VouchNet stores; the verification level is derived from these. */
async function gatherEvidence(
  client: Transaction,
  authorId: string,
  recipientId: string,
  contextType: VouchInput['contextType'],
  contextId: string | null,
): Promise<EvidenceResult> {
  const evidence: VerificationEvidence[] = [];
  const [emails, connection] = await Promise.all([
    client<{ userId: string }[]>`
      SELECT user_id AS "userId" FROM user_emails
      WHERE user_id IN (${authorId},${recipientId}) AND is_primary AND verified_at IS NOT NULL
    `,
    client<{ since: Date }[]>`
      SELECT updated_at AS since FROM connections
      WHERE pair_low_id=LEAST(${authorId}::uuid,${recipientId}::uuid)
        AND pair_high_id=GREATEST(${authorId}::uuid,${recipientId}::uuid) AND state='ACCEPTED'
    `,
  ]);
  if (emails.some((row) => row.userId === authorId))
    evidence.push({ type: 'AUTHOR_EMAIL_VERIFIED' });
  if (emails.some((row) => row.userId === recipientId))
    evidence.push({ type: 'RECIPIENT_EMAIL_VERIFIED' });
  const since = connection[0]?.since;
  if (since !== undefined)
    evidence.push({ type: 'ACCEPTED_CONNECTION', since: new Date(since).toISOString() });
  let sharedContext = false;
  let contextRejected = false;
  if (contextType === 'PROJECT' && contextId !== null) {
    const rows = await client<{ name: string; members: number; contributors: number }[]>`
      SELECT p.name,
        (SELECT count(*)::int FROM (VALUES (${authorId}::uuid),(${recipientId}::uuid)) people(id)
          WHERE people.id=p.owner_id OR EXISTS (SELECT 1 FROM project_contributors c
            WHERE c.project_id=p.id AND c.user_id=people.id AND c.status='ACCEPTED')) AS members,
        (SELECT count(DISTINCT l.author_id)::int FROM project_build_logs l
          WHERE l.project_id=p.id AND l.author_id IN (${authorId},${recipientId})
            AND l.deleted_at IS NULL AND l.moderated_at IS NULL) AS contributors
      FROM projects p WHERE p.id=${contextId}
    `;
    const project = rows[0];
    if (project === undefined || project.members < 2) contextRejected = true;
    else {
      sharedContext = true;
      evidence.push({
        type: 'SHARED_PROJECT_MEMBERSHIP',
        projectId: contextId,
        projectName: project.name,
      });
      if (project.contributors >= 2)
        evidence.push({
          type: 'SHARED_PROJECT_CONTRIBUTION',
          projectId: contextId,
          projectName: project.name,
        });
    }
  }
  if (contextType === 'ORGANIZATION' && contextId !== null) {
    const rows = await client<
      { name: string; members: number; verified: number; domain: boolean }[]
    >`
      SELECT o.name,count(m.user_id)::int AS members,
        count(m.employment_verified_at)::int AS verified,
        (o.verification_status='DOMAIN_VERIFIED') AS domain
      FROM organizations o
      LEFT JOIN organization_members m ON m.organization_id=o.id AND m.user_id IN (${authorId},${recipientId})
      WHERE o.id=${contextId}
      GROUP BY o.id
    `;
    const organization = rows[0];
    if (organization === undefined || organization.members < 2) contextRejected = true;
    else {
      sharedContext = true;
      evidence.push({
        type: 'SHARED_ORGANIZATION_MEMBERSHIP',
        organizationId: contextId,
        organizationName: organization.name,
      });
      // Requires a domain-verified organization; no workflow produces one yet (documented).
      if (organization.domain && organization.verified >= 2)
        evidence.push({
          type: 'VERIFIED_ORGANIZATION_EMPLOYMENT',
          organizationId: contextId,
          organizationName: organization.name,
        });
    }
  }
  return { evidence, connected: since !== undefined, sharedContext, contextRejected };
}

export type ComposerContext = VouchContext & { expectedLevel: VerificationLevel };

export type ComposerState = {
  recipient: VouchPerson;
  eligible: boolean;
  denial: VouchDenial | null;
  contexts: ComposerContext[];
  connected: boolean;
  authorEmailVerified: boolean;
  existing: WorkVouch | null;
};

/** Everything the Vouch Console needs before the author types a word. */
export async function getComposerState(
  authorId: string,
  recipientId: string,
): Promise<ComposerState | null> {
  const client = sql();
  try {
    const recipients = await client<(VouchPerson & { available: boolean; blocked: boolean })[]>`
      SELECT pr.user_id AS "userId",pr.slug,pr.first_name || ' ' || pr.last_name AS name,
        pr.first_name AS "firstName",pr.last_name AS "lastName",pr.headline,
        (u.status='ACTIVE') AS available,
        EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${authorId} AND b.blocked_id=pr.user_id)
          OR (b.blocker_id=pr.user_id AND b.blocked_id=${authorId})) AS blocked
      FROM profiles pr JOIN users u ON u.id=pr.user_id WHERE pr.user_id=${recipientId}
    `;
    const recipient = recipients[0];
    if (recipient === undefined) return null;
    const [contexts, authorRows, existingRows, rateRows] = await Promise.all([
      client<ComposerContext[]>`
        SELECT 'PROJECT' AS type,p.id,p.name,
          CASE WHEN p.visibility='PUBLIC' THEN '/projects/' || p.slug ELSE NULL END AS href,
          CASE WHEN (SELECT count(DISTINCT l.author_id) FROM project_build_logs l WHERE l.project_id=p.id
              AND l.author_id IN (${authorId},${recipientId}) AND l.deleted_at IS NULL
              AND l.moderated_at IS NULL)=2
            THEN 'CONTRIBUTION_VERIFIED' ELSE 'CONTEXT_VERIFIED' END AS "expectedLevel"
        FROM projects p
        WHERE (p.owner_id=${authorId} OR EXISTS (SELECT 1 FROM project_contributors c WHERE c.project_id=p.id
            AND c.user_id=${authorId} AND c.status='ACCEPTED'))
          AND (p.owner_id=${recipientId} OR EXISTS (SELECT 1 FROM project_contributors c WHERE c.project_id=p.id
            AND c.user_id=${recipientId} AND c.status='ACCEPTED'))
        UNION ALL
        SELECT 'ORGANIZATION',o.id,o.name,'/company/' || o.slug,
          CASE WHEN o.verification_status='DOMAIN_VERIFIED' AND a.employment_verified_at IS NOT NULL
              AND r.employment_verified_at IS NOT NULL
            THEN 'ORGANIZATION_VERIFIED' ELSE 'CONTEXT_VERIFIED' END
        FROM organizations o
        JOIN organization_members a ON a.organization_id=o.id AND a.user_id=${authorId}
        JOIN organization_members r ON r.organization_id=o.id AND r.user_id=${recipientId}
        ORDER BY 3
        LIMIT 20
      `,
      client<{ active: boolean; emailVerified: boolean; connected: boolean }[]>`
        SELECT (u.status='ACTIVE') AS active,
          EXISTS (SELECT 1 FROM user_emails e WHERE e.user_id=u.id AND e.is_primary AND e.verified_at IS NOT NULL) AS "emailVerified",
          EXISTS (SELECT 1 FROM connections c WHERE c.pair_low_id=LEAST(${authorId}::uuid,${recipientId}::uuid)
            AND c.pair_high_id=GREATEST(${authorId}::uuid,${recipientId}::uuid) AND c.state='ACCEPTED') AS connected
        FROM users u WHERE u.id=${authorId}
      `,
      client<WorkVouch[]>`
        SELECT ${vouchSelect(client)} ${vouchJoins(client)}
        WHERE v.author_id=${authorId} AND v.recipient_id=${recipientId} AND v.revoked_at IS NULL
      `,
      client<{ day: number; month: number }[]>`
        SELECT count(*) FILTER (WHERE created_at > now() - interval '1 day')::int AS day,
          count(*)::int AS month
        FROM work_vouches WHERE author_id=${authorId} AND created_at > now() - interval '30 days'
      `,
    ]);
    const author = authorRows[0];
    const existing = existingRows[0] ?? null;
    const decision = evaluateVouchEligibility({
      authorId,
      recipientId,
      authorActive: author?.active ?? false,
      authorEmailVerified: author?.emailVerified ?? false,
      recipientAvailable: recipient.available,
      blocked: recipient.blocked,
      connected: author?.connected ?? false,
      sharedContext: contexts.length > 0,
      contextRejected: false,
      existingLiveVouch: false,
      vouchesLastDay: existing === null ? (rateRows[0]?.day ?? 0) : 0,
      vouchesLastThirtyDays: existing === null ? (rateRows[0]?.month ?? 0) : 0,
    });
    return {
      recipient: {
        userId: recipient.userId,
        slug: recipient.slug,
        name: recipient.name,
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        headline: recipient.headline,
      },
      eligible: decision.allowed,
      denial: decision.allowed ? null : decision.code,
      contexts,
      connected: author?.connected ?? false,
      authorEmailVerified: author?.emailVerified ?? false,
      existing,
    };
  } finally {
    await client.end({ timeout: 1 });
  }
}

async function snapshot(client: Transaction, vouchId: string) {
  const rows = await client<{ snapshot: Record<string, unknown> }[]>`
    SELECT json_build_object('relationship',relationship,'contextType',context_type,'contextId',context_id,
      'workedTogetherYear',worked_together_year,'skills',skills,'statement',statement,
      'visibility',visibility,'verificationLevel',verification_level,
      'moderationState',moderation_state,'hidden',hidden_by_recipient_at IS NOT NULL) AS snapshot
    FROM work_vouches WHERE id=${vouchId}
  `;
  return rows[0]?.snapshot ?? {};
}

async function addRevision(
  client: Transaction,
  vouchId: string,
  editorId: string,
  change: 'CREATED' | 'EDITED' | 'REVOKED' | 'HIDDEN' | 'UNHIDDEN' | 'MODERATED',
) {
  const state = await snapshot(client, vouchId);
  await client`
    INSERT INTO work_vouch_revisions (vouch_id,editor_id,change,snapshot)
    VALUES (${vouchId},${editorId},${change},${client.json(state as never)})
  `;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
  );
}

export async function createWorkVouch(
  authorId: string,
  recipientId: string,
  input: VouchInput,
): Promise<{ id: string; verificationLevel: VerificationLevel; createdAt: Date }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      // Serialize concurrent attempts by the same author so rate limits and the duplicate guard hold.
      await transaction`SELECT pg_advisory_xact_lock(hashtext(${`work-vouch:${authorId}`}))`;
      const [authorRows, recipientRows, existingRows, rateRows] = await Promise.all([
        transaction<{ active: boolean }[]>`
          SELECT (status='ACTIVE') AS active FROM users WHERE id=${authorId}
        `,
        transaction<{ available: boolean; blocked: boolean; name: string }[]>`
          SELECT (u.status='ACTIVE') AS available,pr.first_name AS name,
            EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${authorId} AND b.blocked_id=u.id)
              OR (b.blocker_id=u.id AND b.blocked_id=${authorId})) AS blocked
          FROM users u JOIN profiles pr ON pr.user_id=u.id WHERE u.id=${recipientId}
        `,
        transaction<{ id: string }[]>`
          SELECT id FROM work_vouches WHERE author_id=${authorId} AND recipient_id=${recipientId} AND revoked_at IS NULL
        `,
        transaction<{ day: number; month: number }[]>`
          SELECT count(*) FILTER (WHERE created_at > now() - interval '1 day')::int AS day,count(*)::int AS month
          FROM work_vouches WHERE author_id=${authorId} AND created_at > now() - interval '30 days'
        `,
      ]);
      const facts = await gatherEvidence(
        transaction,
        authorId,
        recipientId,
        input.contextType,
        input.contextId,
      );
      const decision = evaluateVouchEligibility({
        authorId,
        recipientId,
        authorActive: authorRows[0]?.active ?? false,
        authorEmailVerified: facts.evidence.some((item) => item.type === 'AUTHOR_EMAIL_VERIFIED'),
        recipientAvailable: recipientRows[0]?.available ?? false,
        blocked: recipientRows[0]?.blocked ?? false,
        connected: facts.connected,
        sharedContext: facts.sharedContext,
        contextRejected: facts.contextRejected,
        existingLiveVouch: existingRows.length > 0,
        vouchesLastDay: rateRows[0]?.day ?? 0,
        vouchesLastThirtyDays: rateRows[0]?.month ?? 0,
      });
      if (!decision.allowed)
        throw new DomainError(
          decision.code,
          decision.code === 'VOUCH_RATE_LIMITED'
            ? 429
            : decision.code === 'ALREADY_VOUCHED'
              ? 409
              : 403,
        );
      const level = computeVerificationLevel(facts.evidence);
      const inserted = await transaction<{ id: string; createdAt: Date }[]>`
        INSERT INTO work_vouches (author_id,recipient_id,relationship,context_type,context_id,
          worked_together_year,skills,statement,visibility,verification_evidence,verification_level)
        VALUES (${authorId},${recipientId},${input.relationship},${input.contextType},${input.contextId},
          ${input.workedTogetherYear},${input.skills},${input.statement},${input.visibility},
          ${transaction.json(facts.evidence as never)},${level})
        RETURNING id,created_at AS "createdAt"
      `;
      const vouch = inserted[0];
      if (vouch === undefined) throw new Error('VOUCH_FAILED');
      await addRevision(transaction, vouch.id, authorId, 'CREATED');
      // Mutual vouches written close together are flagged for reviewers, never shown as a judgement.
      const reverse = await transaction<{ id: string; createdAt: Date }[]>`
        SELECT id,created_at AS "createdAt" FROM work_vouches
        WHERE author_id=${recipientId} AND recipient_id=${authorId} AND revoked_at IS NULL
      `;
      const reverseVouch = reverse[0];
      if (
        reverseVouch !== undefined &&
        isReciprocalPattern(new Date(vouch.createdAt), new Date(reverseVouch.createdAt))
      ) {
        await transaction`
          UPDATE work_vouches SET reciprocal_signal_at=now() WHERE id IN (${vouch.id},${reverseVouch.id})
        `;
        await recordAudit(transaction, {
          actorId: authorId,
          operation: 'WORK_VOUCH_RECIPROCAL_SIGNAL',
          resourceType: 'WORK_VOUCH',
          resourceId: vouch.id,
          policy: 'FLAG_FOR_REVIEW',
        });
      }
      await notifyMember(transaction, {
        userId: recipientId,
        resourceKey: `work-vouch:${vouch.id}`,
        title: 'Someone vouched for your work',
        body: `A ${relationshipLabels[input.relationship].toLowerCase()} vouched for ${input.skills.slice(0, 3).join(', ')}.`,
        href: `/vouches/${vouch.id}`,
      });
      await recordAudit(transaction, {
        actorId: authorId,
        operation: 'WORK_VOUCH_CREATED',
        resourceType: 'WORK_VOUCH',
        resourceId: vouch.id,
        policy: facts.sharedContext ? 'ALLOW_SHARED_CONTEXT' : 'ALLOW_ACCEPTED_CONNECTION',
      });
      return { id: vouch.id, verificationLevel: level, createdAt: vouch.createdAt };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError('ALREADY_VOUCHED', 409);
    throw error;
  } finally {
    await client.end({ timeout: 1 });
  }
}

type LockedVouch = {
  authorId: string;
  recipientId: string;
  revoked: boolean;
  hidden: boolean;
};

async function lockVouch(client: Transaction, vouchId: string): Promise<LockedVouch> {
  const rows = await client<LockedVouch[]>`
    SELECT author_id AS "authorId",recipient_id AS "recipientId",(revoked_at IS NOT NULL) AS revoked,
      (hidden_by_recipient_at IS NOT NULL) AS hidden
    FROM work_vouches WHERE id=${vouchId} FOR UPDATE
  `;
  const vouch = rows[0];
  if (vouch === undefined) throw new DomainError('VOUCH_UNAVAILABLE', 404);
  return vouch;
}

function assertAllowed(
  action: VouchAction,
  actorId: string,
  vouch: LockedVouch,
  isModerator = false,
) {
  if (
    !canPerformVouchAction({
      action,
      actorId,
      authorId: vouch.authorId,
      recipientId: vouch.recipientId,
      revoked: vouch.revoked,
      isModerator,
    })
  )
    throw new DomainError('VOUCH_ACTION_DENIED');
}

/** Only the author edits; every edit keeps a revision and re-derives verification from evidence. */
export async function editWorkVouch(
  actorId: string,
  vouchId: string,
  input: VouchInput,
): Promise<{ verificationLevel: VerificationLevel }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const vouch = await lockVouch(transaction, vouchId);
      assertAllowed('EDIT', actorId, vouch);
      const facts = await gatherEvidence(
        transaction,
        vouch.authorId,
        vouch.recipientId,
        input.contextType,
        input.contextId,
      );
      if (facts.contextRejected) throw new DomainError('CONTEXT_NOT_SHARED');
      if (!facts.connected && !facts.sharedContext) throw new DomainError('RELATIONSHIP_REQUIRED');
      const level = computeVerificationLevel(facts.evidence);
      await transaction`
        UPDATE work_vouches SET relationship=${input.relationship},context_type=${input.contextType},
          context_id=${input.contextId},worked_together_year=${input.workedTogetherYear},
          skills=${input.skills},statement=${input.statement},visibility=${input.visibility},
          verification_evidence=${transaction.json(facts.evidence as never)},verification_level=${level},
          edited_at=now()
        WHERE id=${vouchId}
      `;
      await addRevision(transaction, vouchId, actorId, 'EDITED');
      await recordAudit(transaction, {
        actorId,
        operation: 'WORK_VOUCH_EDITED',
        resourceType: 'WORK_VOUCH',
        resourceId: vouchId,
        policy: 'ALLOW_AUTHOR',
      });
      return { verificationLevel: level };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export type VouchStateChange =
  'REVOKE' | 'HIDE' | 'UNHIDE' | 'MODERATE_REMOVE' | 'MODERATE_RESTORE';

export async function changeWorkVouchState(
  actorId: string,
  vouchId: string,
  change: VouchStateChange,
  isModerator: boolean,
): Promise<void> {
  const client = sql();
  try {
    await client.begin(async (transaction) => {
      const vouch = await lockVouch(transaction, vouchId);
      if (change === 'REVOKE') {
        assertAllowed('REVOKE', actorId, vouch);
        await transaction`UPDATE work_vouches SET revoked_at=now() WHERE id=${vouchId}`;
        await addRevision(transaction, vouchId, actorId, 'REVOKED');
      } else if (change === 'HIDE' || change === 'UNHIDE') {
        assertAllowed(change, actorId, vouch);
        await transaction`
          UPDATE work_vouches SET hidden_by_recipient_at=${change === 'HIDE' ? new Date() : null}
          WHERE id=${vouchId}
        `;
        await addRevision(transaction, vouchId, actorId, change === 'HIDE' ? 'HIDDEN' : 'UNHIDDEN');
      } else {
        assertAllowed('MODERATE', actorId, vouch, isModerator);
        await transaction`
          UPDATE work_vouches SET moderation_state=${change === 'MODERATE_REMOVE' ? 'REMOVED' : 'ACTIVE'}
          WHERE id=${vouchId}
        `;
        await addRevision(transaction, vouchId, actorId, 'MODERATED');
      }
      await recordAudit(transaction, {
        actorId,
        operation: `WORK_VOUCH_${change}`,
        resourceType: 'WORK_VOUCH',
        resourceId: vouchId,
        policy:
          change === 'REVOKE'
            ? 'ALLOW_AUTHOR'
            : change === 'HIDE' || change === 'UNHIDE'
              ? 'ALLOW_RECIPIENT'
              : 'MODERATOR_HUMAN_REVIEW',
      });
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}
