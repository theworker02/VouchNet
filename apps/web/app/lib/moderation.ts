import 'server-only';

import { randomUUID } from 'node:crypto';
import { createSqlClient } from '@nexus/db';

export const moderatorRoles = [
  'TRIAGE',
  'CONTENT_REVIEWER',
  'APPEALS_REVIEWER',
  'COMMUNITY_STEWARD',
] as const;
export type ModeratorRole = (typeof moderatorRoles)[number];

export const reportCategories = [
  'SPAM',
  'HARASSMENT',
  'IMPERSONATION',
  'SAFETY',
  'PRIVACY',
  'OTHER',
] as const;
export type ReportCategory = (typeof reportCategories)[number];

export const reportStatuses = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export type ModeratorApplication = {
  id: string;
  userId: string;
  memberName: string;
  motivation: string;
  relevantExperience: string | null;
  weeklyAvailability: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'WITHDRAWN' | 'REVOKED';
  assignedRole: ModeratorRole | null;
  createdAt: Date;
};

export type ModerationReport = {
  id: string;
  reporterName: string;
  subjectPath: string;
  category: ReportCategory;
  details: string;
  status: ReportStatus;
  assignedToName: string | null;
  resolutionNote: string | null;
  createdAt: Date;
};

export class ModerationError extends Error {
  constructor(
    readonly code:
      | 'APPLICATION_ALREADY_OPEN'
      | 'APPLICATION_NOT_FOUND'
      | 'NOT_AUTHORIZED'
      | 'REPORT_NOT_FOUND'
      | 'ROLE_ASSIGNMENT_FAILED',
  ) {
    super(code);
  }
}

function database() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

export async function activeModeratorRoles(userId: string): Promise<ModeratorRole[]> {
  const sql = database();
  try {
    const rows = await sql<{ role: ModeratorRole }[]>`
      SELECT assignment.role
      FROM moderator_role_assignments assignment
      JOIN users u ON u.id=assignment.user_id
      WHERE assignment.user_id=${userId} AND assignment.status='ACTIVE'
        AND u.status='ACTIVE' AND u.role IN ('MODERATOR','ADMIN')
      ORDER BY assignment.assigned_at ASC
    `;
    return rows.map((row) => row.role);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function canReviewModeration(userId: string): Promise<boolean> {
  const sql = database();
  try {
    const rows = await sql<{ allowed: boolean }[]>`
      SELECT EXISTS(
        SELECT 1 FROM users WHERE id=${userId} AND status='ACTIVE' AND role='ADMIN'
      ) OR EXISTS(
        SELECT 1 FROM moderator_role_assignments assignment
        JOIN users u ON u.id=assignment.user_id
        WHERE assignment.user_id=${userId} AND assignment.status='ACTIVE'
          AND u.status='ACTIVE' AND u.role='MODERATOR'
      ) AS allowed
    `;
    return rows[0]?.allowed === true;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function submitModeratorApplication(input: {
  userId: string;
  motivation: string;
  relevantExperience: string | null;
  weeklyAvailability: string;
}): Promise<void> {
  const sql = database();
  try {
    await sql.begin(async (transaction) => {
      const activeUser = await transaction<{ id: string }[]>`
        SELECT id FROM users WHERE id=${input.userId} AND status='ACTIVE' FOR UPDATE
      `;
      if (activeUser[0] === undefined) throw new ModerationError('NOT_AUTHORIZED');
      const openApplication = await transaction<{ id: string }[]>`
        SELECT id FROM moderator_applications
        WHERE user_id=${input.userId} AND status IN ('PENDING','APPROVED')
        LIMIT 1 FOR UPDATE
      `;
      if (openApplication[0] !== undefined) throw new ModerationError('APPLICATION_ALREADY_OPEN');
      await transaction`
        INSERT INTO moderator_applications (user_id,motivation,relevant_experience,weekly_availability,agreed_to_code)
        VALUES (${input.userId},${input.motivation},${input.relevantExperience},${input.weeklyAvailability},true)
      `;
      await transaction`
        INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision)
        VALUES ('HUMAN',${input.userId},${input.userId},'MODERATOR_APPLICATION_SUBMITTED','MODERATOR_APPLICATION',NULL,${randomUUID()},'SUCCESS','HUMAN_VOLUNTEER_REVIEW_REQUIRED')
      `;
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function listModeratorApplications(): Promise<ModeratorApplication[]> {
  const sql = database();
  try {
    return await sql<ModeratorApplication[]>`
      SELECT application.id,application.user_id AS "userId",
        concat(profile.first_name,' ',profile.last_name) AS "memberName",
        application.motivation,application.relevant_experience AS "relevantExperience",
        application.weekly_availability AS "weeklyAvailability",application.status,
        assignment.role AS "assignedRole",application.created_at AS "createdAt"
      FROM moderator_applications application
      JOIN profiles profile ON profile.user_id=application.user_id
      LEFT JOIN moderator_role_assignments assignment
        ON assignment.user_id=application.user_id AND assignment.status='ACTIVE'
      ORDER BY CASE application.status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END,
        application.created_at DESC
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function reviewModeratorApplication(input: {
  actorId: string;
  applicationId: string;
  decision: 'APPROVE' | 'DECLINE' | 'REVOKE';
  role?: ModeratorRole;
  reviewNote: string | null;
}): Promise<void> {
  const sql = database();
  try {
    await sql.begin(async (transaction) => {
      const administrators = await transaction<{ id: string }[]>`
        SELECT id FROM users WHERE id=${input.actorId} AND role='ADMIN' AND status='ACTIVE' LIMIT 1
      `;
      if (administrators[0] === undefined) throw new ModerationError('NOT_AUTHORIZED');
      const applications = await transaction<{ user_id: string; status: string }[]>`
        SELECT user_id,status FROM moderator_applications WHERE id=${input.applicationId} FOR UPDATE
      `;
      const application = applications[0];
      if (application === undefined) throw new ModerationError('APPLICATION_NOT_FOUND');

      if (input.decision === 'APPROVE') {
        if (application.status !== 'PENDING' || input.role === undefined)
          throw new ModerationError('ROLE_ASSIGNMENT_FAILED');
        await transaction`
          INSERT INTO moderator_role_assignments (user_id,role,assigned_by)
          VALUES (${application.user_id},${input.role},${input.actorId})
        `;
        await transaction`
          UPDATE moderator_applications
          SET status='APPROVED',review_note=${input.reviewNote},reviewed_by=${input.actorId},reviewed_at=now(),updated_at=now()
          WHERE id=${input.applicationId}
        `;
        await transaction`
          UPDATE users SET role='MODERATOR',updated_at=now()
          WHERE id=${application.user_id} AND role<>'ADMIN'
        `;
      } else if (input.decision === 'DECLINE') {
        if (application.status !== 'PENDING') throw new ModerationError('APPLICATION_NOT_FOUND');
        await transaction`
          UPDATE moderator_applications
          SET status='DECLINED',review_note=${input.reviewNote},reviewed_by=${input.actorId},reviewed_at=now(),updated_at=now()
          WHERE id=${input.applicationId}
        `;
      } else {
        if (application.status !== 'APPROVED') throw new ModerationError('APPLICATION_NOT_FOUND');
        await transaction`
          UPDATE moderator_role_assignments
          SET status='REVOKED',revoked_at=now(),revoke_reason=${input.reviewNote}
          WHERE user_id=${application.user_id} AND status='ACTIVE'
        `;
        await transaction`
          UPDATE moderator_applications
          SET status='REVOKED',review_note=${input.reviewNote},reviewed_by=${input.actorId},reviewed_at=now(),updated_at=now()
          WHERE id=${input.applicationId}
        `;
        const remaining = await transaction<{ id: string }[]>`
          SELECT id FROM moderator_role_assignments WHERE user_id=${application.user_id} AND status='ACTIVE' LIMIT 1
        `;
        if (remaining[0] === undefined) {
          await transaction`UPDATE users SET role='USER',updated_at=now() WHERE id=${application.user_id} AND role='MODERATOR'`;
        }
      }

      await transaction`
        INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision)
        VALUES ('MODERATOR',${input.actorId},${application.user_id},${`MODERATOR_APPLICATION_${input.decision}`},'MODERATOR_APPLICATION',${input.applicationId},${randomUUID()},'SUCCESS','ADMIN_HUMAN_REVIEW')
      `;
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function submitModerationReport(input: {
  reporterId: string;
  subjectPath: string;
  category: ReportCategory;
  details: string;
}): Promise<void> {
  const sql = database();
  try {
    await sql.begin(async (transaction) => {
      const reporter = await transaction<{ id: string }[]>`
        SELECT id FROM users WHERE id=${input.reporterId} AND status='ACTIVE'
      `;
      if (reporter[0] === undefined) throw new ModerationError('NOT_AUTHORIZED');
      await transaction`
        INSERT INTO moderation_reports (reporter_id,subject_path,category,details)
        VALUES (${input.reporterId},${input.subjectPath},${input.category},${input.details})
      `;
      await transaction`
        INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision)
        VALUES ('HUMAN',${input.reporterId},${input.reporterId},'MODERATION_REPORT_SUBMITTED','MODERATION_REPORT',NULL,${randomUUID()},'SUCCESS','HUMAN_REVIEW_REQUIRED')
      `;
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function listModerationReports(): Promise<ModerationReport[]> {
  const sql = database();
  try {
    return await sql<ModerationReport[]>`
      SELECT report.id,concat(reporter.first_name,' ',reporter.last_name) AS "reporterName",
        report.subject_path AS "subjectPath",report.category,report.details,report.status,
        CASE WHEN assignee.user_id IS NULL THEN NULL ELSE concat(assignee.first_name,' ',assignee.last_name) END AS "assignedToName",
        report.resolution_note AS "resolutionNote",report.created_at AS "createdAt"
      FROM moderation_reports report
      JOIN profiles reporter ON reporter.user_id=report.reporter_id
      LEFT JOIN profiles assignee ON assignee.user_id=report.assigned_to
      ORDER BY CASE report.status WHEN 'OPEN' THEN 0 WHEN 'UNDER_REVIEW' THEN 1 ELSE 2 END,report.created_at DESC
      LIMIT 150
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function updateModerationReport(input: {
  actorId: string;
  reportId: string;
  status: ReportStatus;
  note: string | null;
}): Promise<void> {
  const sql = database();
  try {
    await sql.begin(async (transaction) => {
      const administrators = await transaction<{ id: string }[]>`
        SELECT id FROM users WHERE id=${input.actorId} AND role='ADMIN' AND status='ACTIVE' LIMIT 1
      `;
      const administrator = administrators[0] !== undefined;
      const roles = administrator
        ? ['ADMIN']
        : await transaction<{ role: ModeratorRole }[]>`
            SELECT assignment.role FROM moderator_role_assignments assignment
            JOIN users u ON u.id=assignment.user_id
            WHERE assignment.user_id=${input.actorId} AND assignment.status='ACTIVE'
              AND u.status='ACTIVE' AND u.role='MODERATOR'
          `.then((rows) => rows.map((row) => row.role));
      if (roles.length === 0) throw new ModerationError('NOT_AUTHORIZED');
      const canRecordOutcome =
        administrator || roles.includes('CONTENT_REVIEWER') || roles.includes('COMMUNITY_STEWARD');
      const canTriage = canRecordOutcome || roles.includes('TRIAGE');
      if (!canTriage || (!canRecordOutcome && input.status !== 'UNDER_REVIEW'))
        throw new ModerationError('NOT_AUTHORIZED');

      const reports = await transaction<{ id: string }[]>`
        UPDATE moderation_reports
        SET status=${input.status},assigned_to=${input.actorId},resolution_note=${input.note},
          resolved_at=CASE WHEN ${input.status} IN ('RESOLVED','DISMISSED') THEN now() ELSE NULL END,
          updated_at=now()
        WHERE id=${input.reportId}
        RETURNING id
      `;
      if (reports[0] === undefined) throw new ModerationError('REPORT_NOT_FOUND');
      await transaction`
        INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision)
        VALUES ('MODERATOR',${input.actorId},NULL,${`MODERATION_REPORT_${input.status}`},'MODERATION_REPORT',${input.reportId},${randomUUID()},'SUCCESS','HUMAN_MODERATION_REVIEW')
      `;
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}
