import 'server-only';
import { createSqlClient } from '@nexus/db';
import { DomainError, databaseClient, notifyMember, recordAudit } from './build-notifications';
import {
  canFollowProject,
  evaluateContributorInvite,
  nextContributorStatus,
  normalizeProjectStatus,
  projectLimits,
  type ContributorAction,
  type ContributorStatus,
  type LookingFor,
  type ProjectInput,
  type ProjectStatus,
  type ProjectUpdate,
} from './project-model';

export type ProjectRecord = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  status: ProjectStatus;
  projectUrl: string | null;
  repositoryUrl: string | null;
  documentationUrl: string | null;
  demoUrl: string | null;
  ongoing: boolean;
  openSource: boolean;
  lookingFor: LookingFor[];
  ownerId: string;
  ownerName: string;
  ownerSlug: string;
  tags: string[];
  contributorCount: number;
  followerCount: number;
  createdAt: Date;
  lastActivityAt: Date;
};

export type ProjectPerson = {
  userId: string;
  slug: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  role: string;
};

export type BuildLogEntry = {
  id: string;
  title: string;
  body: string;
  loggedOn: string;
  createdAt: Date;
  author: { userId: string; slug: string; name: string };
};

export type ProjectViewerState = {
  userId: string | null;
  role: 'OWNER' | 'CONTRIBUTOR' | 'INVITEE' | 'MEMBER' | 'ANONYMOUS';
  isFollowing: boolean;
  /** The viewer's own contributor row: a pending invitation or an accepted contribution. */
  contributorId: string | null;
};

export type ProjectDetail = ProjectRecord & {
  contributors: (ProjectPerson & { contributorId: string })[];
  pendingInvites: (ProjectPerson & { contributorId: string })[];
  buildLogs: BuildLogEntry[];
  viewer: ProjectViewerState;
};

const sql = () => databaseClient(createSqlClient);

/** Shared projection: legacy statuses are normalized after the query. */
function projectColumns(client: ReturnType<typeof sql>) {
  return client`
    p.id,p.slug,p.name,p.summary,p.description,p.status,p.project_url AS "projectUrl",
    p.repository_url AS "repositoryUrl",p.documentation_url AS "documentationUrl",
    p.demo_url AS "demoUrl",p.ongoing,p.open_source AS "openSource",p.looking_for AS "lookingFor",
    p.owner_id AS "ownerId",pr.first_name || ' ' || pr.last_name AS "ownerName",pr.slug AS "ownerSlug",
    p.created_at AS "createdAt",p.last_activity_at AS "lastActivityAt",
    COALESCE((SELECT array_agg(pt.tag ORDER BY pt.tag) FROM project_tags pt WHERE pt.project_id=p.id),'{}') AS tags,
    (SELECT count(*)::int FROM project_contributors pc WHERE pc.project_id=p.id AND pc.status='ACCEPTED') AS "contributorCount",
    (SELECT count(*)::int FROM project_follows pf WHERE pf.project_id=p.id) AS "followerCount"
  `;
}

/**
 * Visibility mirrors the existing public-project boundary: a PUBLIC project of an ACTIVE owner
 * whose profile is PUBLIC (or MEMBERS, for signed-in viewers), never across a block. Owners and
 * invited/accepted contributors can always see their own project.
 */
function visibleTo(client: ReturnType<typeof sql>, viewerId: string | null) {
  return client`(
    (p.visibility='PUBLIC' AND u.status='ACTIVE'
      AND (pr.visibility='PUBLIC' OR (${viewerId}::uuid IS NOT NULL AND pr.visibility='MEMBERS'))
      AND (${viewerId}::uuid IS NULL OR NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id=${viewerId}::uuid AND b.blocked_id=p.owner_id)
           OR (b.blocker_id=p.owner_id AND b.blocked_id=${viewerId}::uuid))))
    OR p.owner_id=${viewerId}::uuid
    OR EXISTS (SELECT 1 FROM project_contributors vc WHERE vc.project_id=p.id
      AND vc.user_id=${viewerId}::uuid AND vc.status IN ('INVITED','ACCEPTED'))
  )`;
}

function normalize<T extends { status: string }>(row: T): T & { status: ProjectStatus } {
  return { ...row, status: normalizeProjectStatus(row.status) };
}

export async function listOwnProjects(ownerId: string): Promise<ProjectRecord[]> {
  const client = sql();
  try {
    const rows = await client<ProjectRecord[]>`
      SELECT ${projectColumns(client)}
      FROM projects p JOIN profiles pr ON pr.user_id=p.owner_id
      WHERE p.owner_id=${ownerId}
      ORDER BY p.last_activity_at DESC
    `;
    return rows.map(normalize);
  } finally {
    await client.end({ timeout: 1 });
  }
}

/** Projects a member contributes to (accepted) or has been invited to. */
export async function listContributorProjects(
  userId: string,
): Promise<
  (ProjectRecord & { contributorId: string; contributorStatus: ContributorStatus; role: string })[]
> {
  const client = sql();
  try {
    const rows = await client<
      (ProjectRecord & {
        contributorId: string;
        contributorStatus: ContributorStatus;
        role: string;
      })[]
    >`
      SELECT ${projectColumns(client)},pc.id AS "contributorId",pc.status AS "contributorStatus",pc.role
      FROM project_contributors pc
      JOIN projects p ON p.id=pc.project_id
      JOIN profiles pr ON pr.user_id=p.owner_id
      JOIN users u ON u.id=p.owner_id AND u.status='ACTIVE'
      WHERE pc.user_id=${userId} AND pc.status IN ('INVITED','ACCEPTED')
      ORDER BY pc.status='INVITED' DESC,p.last_activity_at DESC
    `;
    return rows.map(normalize);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function listFollowedProjects(userId: string, limit = 12): Promise<ProjectRecord[]> {
  const client = sql();
  try {
    const rows = await client<ProjectRecord[]>`
      SELECT ${projectColumns(client)}
      FROM project_follows f
      JOIN projects p ON p.id=f.project_id
      JOIN profiles pr ON pr.user_id=p.owner_id
      JOIN users u ON u.id=p.owner_id
      WHERE f.user_id=${userId} AND ${visibleTo(client, userId)}
      ORDER BY p.last_activity_at DESC
      LIMIT ${limit}
    `;
    return rows.map(normalize);
  } finally {
    await client.end({ timeout: 1 });
  }
}

/** Projects shown on a profile: owned plus accepted contributions, filtered for the viewer. */
export async function listProfileProjects(
  profileUserId: string,
  viewerId: string | null,
): Promise<(ProjectRecord & { relation: 'OWNER' | 'CONTRIBUTOR' })[]> {
  const client = sql();
  try {
    const rows = await client<(ProjectRecord & { relation: 'OWNER' | 'CONTRIBUTOR' })[]>`
      SELECT ${projectColumns(client)},
        CASE WHEN p.owner_id=${profileUserId} THEN 'OWNER' ELSE 'CONTRIBUTOR' END AS relation
      FROM projects p
      JOIN profiles pr ON pr.user_id=p.owner_id
      JOIN users u ON u.id=p.owner_id
      WHERE (p.owner_id=${profileUserId} OR EXISTS (
          SELECT 1 FROM project_contributors c WHERE c.project_id=p.id
            AND c.user_id=${profileUserId} AND c.status='ACCEPTED'))
        AND ${visibleTo(client, viewerId)}
      ORDER BY (p.owner_id=${profileUserId}) DESC,p.last_activity_at DESC
      LIMIT 12
    `;
    return rows.map(normalize);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function getPublicProject(slug: string): Promise<ProjectRecord | null> {
  const client = sql();
  try {
    const rows = await client<ProjectRecord[]>`
      SELECT ${projectColumns(client)}
      FROM projects p
      JOIN profiles pr ON pr.user_id=p.owner_id
      JOIN users u ON u.id=p.owner_id AND u.status='ACTIVE'
      WHERE p.slug=${slug} AND p.visibility='PUBLIC' AND pr.visibility='PUBLIC'
    `;
    return rows[0] === undefined ? null : normalize(rows[0]);
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function getProjectDetail(
  slug: string,
  viewerId: string | null,
): Promise<ProjectDetail | null> {
  const client = sql();
  try {
    const rows = await client<ProjectRecord[]>`
      SELECT ${projectColumns(client)}
      FROM projects p
      JOIN profiles pr ON pr.user_id=p.owner_id
      JOIN users u ON u.id=p.owner_id
      WHERE p.slug=${slug} AND ${visibleTo(client, viewerId)}
    `;
    const project = rows[0];
    if (project === undefined) return null;
    const [people, logs, viewerRows] = await Promise.all([
      client<(ProjectPerson & { contributorId: string; status: ContributorStatus })[]>`
        SELECT c.id AS "contributorId",c.status,c.role,pr.user_id AS "userId",pr.slug,
          pr.first_name AS "firstName",pr.last_name AS "lastName",pr.headline
        FROM project_contributors c
        JOIN profiles pr ON pr.user_id=c.user_id
        JOIN users u ON u.id=c.user_id AND u.status='ACTIVE'
        WHERE c.project_id=${project.id} AND c.status IN ('ACCEPTED','INVITED')
        ORDER BY c.responded_at ASC NULLS LAST,c.created_at ASC
      `,
      client<BuildLogEntry[]>`
        SELECT l.id,l.title,l.body,to_char(l.logged_on,'YYYY-MM-DD') AS "loggedOn",l.created_at AS "createdAt",
          json_build_object('userId',pr.user_id,'slug',pr.slug,'name',pr.first_name || ' ' || pr.last_name) AS author
        FROM project_build_logs l
        JOIN profiles pr ON pr.user_id=l.author_id
        WHERE l.project_id=${project.id} AND l.deleted_at IS NULL AND l.moderated_at IS NULL
        ORDER BY l.logged_on DESC,l.created_at DESC
        LIMIT 40
      `,
      viewerId === null
        ? Promise.resolve([] as { following: boolean }[])
        : client<{ following: boolean }[]>`
            SELECT EXISTS(SELECT 1 FROM project_follows WHERE project_id=${project.id} AND user_id=${viewerId}) AS following
          `,
    ]);
    const accepted = people.filter((person) => person.status === 'ACCEPTED');
    const invited = people.filter((person) => person.status === 'INVITED');
    const viewerInvite = invited.find((person) => person.userId === viewerId);
    const viewerContribution = accepted.find((person) => person.userId === viewerId);
    const role: ProjectViewerState['role'] =
      viewerId === null
        ? 'ANONYMOUS'
        : viewerId === project.ownerId
          ? 'OWNER'
          : accepted.some((person) => person.userId === viewerId)
            ? 'CONTRIBUTOR'
            : viewerInvite !== undefined
              ? 'INVITEE'
              : 'MEMBER';
    return {
      ...normalize(project),
      contributors: accepted,
      pendingInvites: role === 'OWNER' ? invited : [],
      buildLogs: logs,
      viewer: {
        userId: viewerId,
        role,
        isFollowing: viewerRows[0]?.following ?? false,
        contributorId: (viewerContribution ?? viewerInvite)?.contributorId ?? null,
      },
    };
  } finally {
    await client.end({ timeout: 1 });
  }
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}

export async function createProject(
  ownerId: string,
  input: ProjectInput,
): Promise<{ slug: string }> {
  const client = sql();
  const slug = `${makeSlug(input.name) || 'project'}-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await client.begin(async (transaction) => {
      const rows = await transaction<{ id: string }[]>`
        INSERT INTO projects (owner_id,slug,name,summary,description,status,project_url,repository_url,
          documentation_url,demo_url,open_source,looking_for,ongoing)
        VALUES (${ownerId},${slug},${input.name},${input.summary},${input.description},${input.status},
          ${input.projectUrl ?? null},${input.repositoryUrl ?? null},${input.documentationUrl ?? null},
          ${input.demoUrl ?? null},${input.openSource},${input.lookingFor},
          ${input.status !== 'ARCHIVED'})
        RETURNING id
      `;
      const project = rows[0];
      if (project === undefined) throw new Error('PROJECT_CREATION_FAILED');
      for (const tag of input.tags)
        await transaction`INSERT INTO project_tags (project_id,tag) VALUES (${project.id},${tag})`;
      await recordAudit(transaction, {
        actorId: ownerId,
        operation: 'PROJECT_CREATED',
        resourceType: 'PROJECT',
        resourceId: project.id,
        policy: 'ALLOW_OWNER',
      });
    });
    return { slug };
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function updateProject(
  actorId: string,
  projectId: string,
  update: ProjectUpdate,
): Promise<{ slug: string }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const rows = await transaction<{ ownerId: string; slug: string; status: string }[]>`
        SELECT owner_id AS "ownerId",slug,status FROM projects WHERE id=${projectId} FOR UPDATE
      `;
      const project = rows[0];
      if (project === undefined) throw new DomainError('PROJECT_UNAVAILABLE', 404);
      if (project.ownerId !== actorId) throw new DomainError('OWNER_REQUIRED');
      const statusChanged =
        update.status !== undefined && update.status !== normalizeProjectStatus(project.status);
      await transaction`
        UPDATE projects SET
          name=COALESCE(${update.name ?? null},name),
          summary=COALESCE(${update.summary ?? null},summary),
          description=COALESCE(${update.description ?? null},description),
          status=COALESCE(${update.status ?? null},status),
          project_url=CASE WHEN ${update.projectUrl !== undefined} THEN ${update.projectUrl ?? null} ELSE project_url END,
          repository_url=CASE WHEN ${update.repositoryUrl !== undefined} THEN ${update.repositoryUrl ?? null} ELSE repository_url END,
          documentation_url=CASE WHEN ${update.documentationUrl !== undefined} THEN ${update.documentationUrl ?? null} ELSE documentation_url END,
          demo_url=CASE WHEN ${update.demoUrl !== undefined} THEN ${update.demoUrl ?? null} ELSE demo_url END,
          open_source=COALESCE(${update.openSource ?? null},open_source),
          looking_for=COALESCE(${update.lookingFor ?? null}::text[],looking_for),
          status_changed_at=CASE WHEN ${statusChanged} THEN now() ELSE status_changed_at END,
          last_activity_at=CASE WHEN ${statusChanged} THEN now() ELSE last_activity_at END,
          updated_at=now()
        WHERE id=${projectId}
      `;
      if (update.tags !== undefined) {
        await transaction`DELETE FROM project_tags WHERE project_id=${projectId}`;
        for (const tag of update.tags)
          await transaction`INSERT INTO project_tags (project_id,tag) VALUES (${projectId},${tag})`;
      }
      await recordAudit(transaction, {
        actorId,
        operation: 'PROJECT_UPDATED',
        resourceType: 'PROJECT',
        resourceId: projectId,
        policy: 'ALLOW_OWNER',
      });
      return { slug: project.slug };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

async function loadVisibleProject(
  client: ReturnType<typeof sql>,
  projectId: string,
  viewerId: string,
): Promise<{ id: string; ownerId: string; name: string; slug: string; blocked: boolean } | null> {
  const rows = await client<
    { id: string; ownerId: string; name: string; slug: string; blocked: boolean }[]
  >`
    SELECT p.id,p.owner_id AS "ownerId",p.name,p.slug,
      EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${viewerId} AND b.blocked_id=p.owner_id)
        OR (b.blocker_id=p.owner_id AND b.blocked_id=${viewerId})) AS blocked
    FROM projects p JOIN profiles pr ON pr.user_id=p.owner_id JOIN users u ON u.id=p.owner_id
    WHERE p.id=${projectId} AND ${visibleTo(client, viewerId)}
  `;
  return rows[0] ?? null;
}

export async function setProjectFollow(
  actorId: string,
  projectId: string,
  follow: boolean,
): Promise<{ following: boolean; followerCount: number }> {
  const client = sql();
  try {
    if (follow) {
      const project = await loadVisibleProject(client, projectId, actorId);
      const decision = canFollowProject({
        actorId,
        ownerId: project?.ownerId ?? '',
        projectVisible: project !== null,
        blocked: project?.blocked ?? false,
      });
      if (!decision.allowed) throw new DomainError(decision.code);
      await client.begin(async (transaction) => {
        const inserted = await transaction`
          INSERT INTO project_follows (project_id,user_id) VALUES (${projectId},${actorId})
          ON CONFLICT DO NOTHING RETURNING project_id
        `;
        if (inserted.length > 0 && project !== null)
          await notifyMember(transaction, {
            userId: project.ownerId,
            resourceKey: `project-followers:${projectId}`,
            title: `New followers on ${project.name}`,
            body: 'People are following your project to see its build log.',
            href: `/projects/${project.slug}`,
          });
      });
    } else {
      await client`DELETE FROM project_follows WHERE project_id=${projectId} AND user_id=${actorId}`;
    }
    const count = await client<{ count: number }[]>`
      SELECT count(*)::int AS count FROM project_follows WHERE project_id=${projectId}
    `;
    return { following: follow, followerCount: count[0]?.count ?? 0 };
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function inviteContributor(
  actorId: string,
  projectId: string,
  input: { profileSlug: string; role: string },
): Promise<{ contributorId: string }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const projects = await transaction<{ ownerId: string; name: string; slug: string }[]>`
        SELECT owner_id AS "ownerId",name,slug FROM projects WHERE id=${projectId} FOR UPDATE
      `;
      const project = projects[0];
      if (project === undefined) throw new DomainError('PROJECT_UNAVAILABLE', 404);
      const invitees = await transaction<{ userId: string; active: boolean; blocked: boolean }[]>`
        SELECT pr.user_id AS "userId",u.status='ACTIVE' AS active,
          EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${actorId} AND b.blocked_id=pr.user_id)
            OR (b.blocker_id=pr.user_id AND b.blocked_id=${actorId})) AS blocked
        FROM profiles pr JOIN users u ON u.id=pr.user_id WHERE pr.slug=${input.profileSlug}
      `;
      const invitee = invitees[0];
      const [existingRows, counts] = await Promise.all([
        invitee === undefined
          ? Promise.resolve(
              [] as { id: string; status: ContributorStatus; respondedAt: Date | null }[],
            )
          : transaction<{ id: string; status: ContributorStatus; respondedAt: Date | null }[]>`
              SELECT id,status,responded_at AS "respondedAt" FROM project_contributors
              WHERE project_id=${projectId} AND user_id=${invitee.userId}
            `,
        transaction<{ accepted: number; pending: number }[]>`
          SELECT count(*) FILTER (WHERE status='ACCEPTED')::int AS accepted,
            count(*) FILTER (WHERE status='INVITED')::int AS pending
          FROM project_contributors WHERE project_id=${projectId}
        `,
      ]);
      const existing = existingRows[0] ?? null;
      const decision = evaluateContributorInvite({
        actorId,
        ownerId: project.ownerId,
        inviteeId: invitee?.userId ?? null,
        inviteeActive: invitee?.active ?? false,
        blocked: invitee?.blocked ?? false,
        existing,
        acceptedCount: counts[0]?.accepted ?? 0,
        pendingCount: counts[0]?.pending ?? 0,
      });
      if (!decision.allowed || invitee === undefined)
        throw new DomainError(decision.allowed ? 'PROFILE_UNAVAILABLE' : decision.code);
      const rows = await transaction<{ id: string }[]>`
        INSERT INTO project_contributors (project_id,user_id,role,invited_by)
        VALUES (${projectId},${invitee.userId},${input.role},${actorId})
        ON CONFLICT (project_id,user_id) DO UPDATE SET status='INVITED',role=EXCLUDED.role,
          invited_by=EXCLUDED.invited_by,responded_at=NULL,updated_at=now(),created_at=now()
        RETURNING id
      `;
      const contributorId = rows[0]?.id;
      if (contributorId === undefined) throw new Error('INVITE_FAILED');
      await notifyMember(transaction, {
        userId: invitee.userId,
        resourceKey: `project-invite:${projectId}`,
        title: `You were invited to contribute to ${project.name}`,
        body: `Role: ${input.role}. Accept to appear as a contributor on the project page.`,
        href: '/projects',
      });
      await recordAudit(transaction, {
        actorId,
        operation: 'PROJECT_CONTRIBUTOR_INVITED',
        resourceType: 'PROJECT_CONTRIBUTOR',
        resourceId: contributorId,
        policy: 'ALLOW_OWNER',
      });
      return { contributorId };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function respondToContribution(
  actorId: string,
  projectId: string,
  contributorId: string,
  action: ContributorAction,
): Promise<{ status: ContributorStatus }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const rows = await transaction<
        { userId: string; status: ContributorStatus; ownerId: string; name: string; slug: string }[]
      >`
        SELECT c.user_id AS "userId",c.status,p.owner_id AS "ownerId",p.name,p.slug
        FROM project_contributors c JOIN projects p ON p.id=c.project_id
        WHERE c.id=${contributorId} AND c.project_id=${projectId}
        FOR UPDATE OF c
      `;
      const record = rows[0];
      if (record === undefined) throw new DomainError('CONTRIBUTION_UNAVAILABLE', 404);
      const next = nextContributorStatus({
        action,
        current: record.status,
        actorIsOwner: actorId === record.ownerId,
        actorIsContributor: actorId === record.userId,
      });
      if (next === null) throw new DomainError('CONTRIBUTION_TRANSITION_DENIED');
      await transaction`
        UPDATE project_contributors SET status=${next},responded_at=now(),updated_at=now()
        WHERE id=${contributorId}
      `;
      if (next === 'ACCEPTED') {
        await transaction`UPDATE projects SET last_activity_at=now() WHERE id=${projectId}`;
        await notifyMember(transaction, {
          userId: record.ownerId,
          resourceKey: `project-contributor:${projectId}`,
          title: `A contributor joined ${record.name}`,
          body: 'Your invitation was accepted. They now appear on the project page.',
          href: `/projects/${record.slug}`,
        });
      }
      await recordAudit(transaction, {
        actorId,
        operation: `PROJECT_CONTRIBUTOR_${action}`,
        resourceType: 'PROJECT_CONTRIBUTOR',
        resourceId: contributorId,
        policy: actorId === record.ownerId ? 'ALLOW_OWNER' : 'ALLOW_CONTRIBUTOR',
      });
      return { status: next };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function addBuildLog(
  actorId: string,
  projectId: string,
  input: { title: string; body: string; loggedOn?: string | undefined },
): Promise<{ id: string }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const rows = await transaction<
        { ownerId: string; name: string; slug: string; allowed: boolean }[]
      >`
        SELECT p.owner_id AS "ownerId",p.name,p.slug,
          (p.owner_id=${actorId} OR EXISTS (SELECT 1 FROM project_contributors c WHERE c.project_id=p.id
            AND c.user_id=${actorId} AND c.status='ACCEPTED')) AS allowed
        FROM projects p WHERE p.id=${projectId} FOR UPDATE
      `;
      const project = rows[0];
      if (project === undefined) throw new DomainError('PROJECT_UNAVAILABLE', 404);
      if (!project.allowed) throw new DomainError('CONTRIBUTOR_REQUIRED');
      const today = await transaction<{ count: number }[]>`
        SELECT count(*)::int AS count FROM project_build_logs
        WHERE author_id=${actorId} AND created_at > now() - interval '1 day'
      `;
      if ((today[0]?.count ?? 0) >= projectLimits.buildLogsPerDay)
        throw new DomainError('BUILD_LOG_RATE_LIMITED', 429);
      const loggedOn =
        input.loggedOn !== undefined && input.loggedOn <= new Date().toISOString().slice(0, 10)
          ? input.loggedOn
          : new Date().toISOString().slice(0, 10);
      const inserted = await transaction<{ id: string }[]>`
        INSERT INTO project_build_logs (project_id,author_id,title,body,logged_on)
        VALUES (${projectId},${actorId},${input.title},${input.body},${loggedOn})
        RETURNING id
      `;
      const id = inserted[0]?.id;
      if (id === undefined) throw new Error('BUILD_LOG_FAILED');
      await transaction`UPDATE projects SET last_activity_at=now(),updated_at=now() WHERE id=${projectId}`;
      // One aggregated, bounded notification per follower per project keeps updates useful.
      await transaction`
        INSERT INTO member_notifications (user_id,category,resource_key,title,body,href)
        SELECT f.user_id,'BUILD_IN_PUBLIC',${`build-log:${projectId}`},${`New build log on ${project.name}`.slice(0, 160)},
          ${input.title.slice(0, 500)},${`/projects/${project.slug}`}
        FROM project_follows f WHERE f.project_id=${projectId} AND f.user_id<>${actorId}
        ORDER BY f.created_at DESC LIMIT 500
        ON CONFLICT (user_id,category,resource_key) DO UPDATE
          SET title=EXCLUDED.title,body=EXCLUDED.body,href=EXCLUDED.href,read_at=NULL,created_at=now()
      `;
      await recordAudit(transaction, {
        actorId,
        operation: 'PROJECT_BUILD_LOG_CREATED',
        resourceType: 'PROJECT_BUILD_LOG',
        resourceId: id,
        policy: 'ALLOW_PROJECT_MEMBER',
      });
      return { id };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

/** Authors and owners delete; moderators hide (which also revokes participation points). */
export async function removeBuildLog(
  actorId: string,
  projectId: string,
  logId: string,
  isModerator: boolean,
): Promise<void> {
  const client = sql();
  try {
    await client.begin(async (transaction) => {
      const rows = await transaction<{ authorId: string; ownerId: string }[]>`
        SELECT l.author_id AS "authorId",p.owner_id AS "ownerId"
        FROM project_build_logs l JOIN projects p ON p.id=l.project_id
        WHERE l.id=${logId} AND l.project_id=${projectId} AND l.deleted_at IS NULL FOR UPDATE OF l
      `;
      const log = rows[0];
      if (log === undefined) throw new DomainError('BUILD_LOG_UNAVAILABLE', 404);
      const ownsIt = actorId === log.authorId || actorId === log.ownerId;
      if (!ownsIt && !isModerator) throw new DomainError('NOT_AUTHORIZED');
      if (ownsIt)
        await transaction`UPDATE project_build_logs SET deleted_at=now() WHERE id=${logId}`;
      else {
        await transaction`UPDATE project_build_logs SET moderated_at=now() WHERE id=${logId}`;
        await transaction`
          INSERT INTO activity_point_revocations (resource_type,resource_id,reason,revoked_by)
          VALUES ('BUILD_LOG',${logId},'Removed by a human moderator',${actorId})
          ON CONFLICT DO NOTHING
        `;
      }
      await recordAudit(transaction, {
        actorId,
        operation: ownsIt ? 'PROJECT_BUILD_LOG_DELETED' : 'PROJECT_BUILD_LOG_MODERATED',
        resourceType: 'PROJECT_BUILD_LOG',
        resourceId: logId,
        policy: ownsIt ? 'ALLOW_AUTHOR_OR_OWNER' : 'MODERATOR_HUMAN_REVIEW',
      });
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}
