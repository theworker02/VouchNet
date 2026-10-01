import 'server-only';
import { randomUUID } from 'node:crypto';
import { createSqlClient } from '@nexus/db';
import { logger } from '@nexus/observability';
import {
  canEmployerMoveApplication,
  type ApplicationStage,
  type EmployerApplicationStage,
} from './application-stages';
import { getUserSettings } from './settings';

export {
  canEmployerMoveApplication,
  employerApplicationStages,
  type ApplicationStage,
  type EmployerApplicationStage,
} from './application-stages';

export class NativeApplicationError extends Error {
  constructor(
    readonly code:
      | 'ALREADY_APPLIED'
      | 'APPLICATION_NOT_FOUND'
      | 'INVALID_STAGE_TRANSITION'
      | 'JOB_NOT_AVAILABLE'
      | 'NOT_JOB_OWNER',
  ) {
    super(code);
  }
}

function sql() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

export async function submitNativeApplication(input: {
  candidateId: string;
  coverNote: string;
  jobSlug: string;
}): Promise<{ id: string }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const jobs = await transaction<{ id: string }[]>`
        SELECT id FROM jobs
        WHERE slug=${input.jobSlug} AND deleted_at IS NULL AND native_application_enabled=true
          AND source_status IN ('SOURCE_REVIEWED','SOURCE_LIVE')
          AND employer_review_status='APPROVED'
        FOR UPDATE
      `;
      const job = jobs[0];
      if (job === undefined) throw new NativeApplicationError('JOB_NOT_AVAILABLE');
      const applications = await transaction<{ id: string }[]>`
        INSERT INTO job_applications (job_id,candidate_id,cover_note)
        VALUES (${job.id},${input.candidateId},${input.coverNote})
        ON CONFLICT (job_id,candidate_id) DO NOTHING
        RETURNING id
      `;
      const application = applications[0];
      if (application === undefined) throw new NativeApplicationError('ALREADY_APPLIED');
      await transaction`
        INSERT INTO job_application_events (application_id,actor_id,event_type,stage_to)
        VALUES (${application.id},${input.candidateId},'SUBMITTED','SUBMITTED')
      `;
      await transaction`
        INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision)
        VALUES ('HUMAN',${input.candidateId},${input.candidateId},'NATIVE_JOB_APPLICATION_SUBMITTED',
          'JOB_APPLICATION',${application.id},${randomUUID()},'SUCCESS','CANDIDATE_AUTHORIZED')
      `;
      return application;
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function listCandidateApplications(candidateId: string) {
  const client = sql();
  try {
    return await client<
      Array<{
        createdAt: Date;
        currentStage: ApplicationStage;
        id: string;
        jobSlug: string;
        organizationName: string;
        title: string;
      }>
    >`
      SELECT a.id,a.current_stage AS "currentStage",a.created_at AS "createdAt",j.slug AS "jobSlug",
        j.title,o.name AS "organizationName"
      FROM job_applications a JOIN jobs j ON j.id=a.job_id JOIN organizations o ON o.id=j.organization_id
      WHERE a.candidate_id=${candidateId}
      ORDER BY a.created_at DESC
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export type EmployerApplication = {
  candidateHeadline: string | null;
  candidateLocation: string | null;
  candidateName: string;
  candidateSlug: string;
  coverNote: string;
  createdAt: Date;
  currentStage: ApplicationStage;
  id: string;
};

export type EmployerApplicationJob = {
  organizationName: string;
  slug: string;
  title: string;
};

export async function getEmployerApplicationJob(
  ownerId: string,
  jobSlug: string,
): Promise<EmployerApplicationJob | null> {
  const client = sql();
  try {
    const rows = await client<EmployerApplicationJob[]>`
      SELECT j.slug,j.title,o.name AS "organizationName"
      FROM jobs j JOIN organizations o ON o.id=j.organization_id
      WHERE j.slug=${jobSlug} AND j.posting_owner_user_id=${ownerId} AND j.deleted_at IS NULL
      LIMIT 1
    `;
    return rows[0] ?? null;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function listEmployerApplications(ownerId: string, jobSlug: string) {
  const client = sql();
  try {
    return await client<EmployerApplication[]>`
      SELECT a.id,a.cover_note AS "coverNote",a.current_stage AS "currentStage",a.created_at AS "createdAt",
        concat(p.first_name,' ',p.last_name) AS "candidateName",p.slug AS "candidateSlug",
        p.headline AS "candidateHeadline",p.location AS "candidateLocation"
      FROM job_applications a
      JOIN jobs j ON j.id=a.job_id
      JOIN profiles p ON p.user_id=a.candidate_id
      WHERE j.slug=${jobSlug} AND j.posting_owner_user_id=${ownerId} AND j.deleted_at IS NULL
      ORDER BY a.created_at DESC
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

async function createStageNotification(input: {
  candidateId: string;
  jobSlug: string;
  jobTitle: string;
  stage: EmployerApplicationStage;
}) {
  const settings = await getUserSettings(input.candidateId);
  if (!settings.notifications.channels.JOB_MATCHES.inApp) return;
  const title = `Application update: ${input.jobTitle}`;
  const stageLabel = input.stage.replaceAll('_', ' ').toLowerCase();
  const client = sql();
  try {
    await client`
      INSERT INTO member_notifications (user_id,category,resource_key,title,body,href)
      VALUES (
        ${input.candidateId},'JOB_APPLICATION',${`${input.jobSlug}:${input.stage}`},${title},
        ${`The hiring team moved your application to ${stageLabel}.`},${`/jobs/tracker`}
      )
      ON CONFLICT (user_id,category,resource_key) DO UPDATE
        SET title=EXCLUDED.title,body=EXCLUDED.body,href=EXCLUDED.href,read_at=NULL,created_at=now()
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function moveApplicationStage(input: {
  applicationId: string;
  jobSlug: string;
  note: string;
  ownerId: string;
  stage: EmployerApplicationStage;
}): Promise<void> {
  const client = sql();
  let notification: { candidateId: string; jobSlug: string; jobTitle: string };
  try {
    notification = await client.begin(async (transaction) => {
      const rows = await transaction<
        Array<{
          candidateId: string;
          currentStage: ApplicationStage;
          jobSlug: string;
          jobTitle: string;
          ownerId: string | null;
        }>
      >`
        SELECT a.candidate_id AS "candidateId",a.current_stage AS "currentStage",j.slug AS "jobSlug",
          j.title AS "jobTitle",j.posting_owner_user_id AS "ownerId"
        FROM job_applications a JOIN jobs j ON j.id=a.job_id
        WHERE a.id=${input.applicationId} AND j.slug=${input.jobSlug} AND j.deleted_at IS NULL
        FOR UPDATE
      `;
      const application = rows[0];
      if (application === undefined) throw new NativeApplicationError('APPLICATION_NOT_FOUND');
      if (application.ownerId !== input.ownerId) throw new NativeApplicationError('NOT_JOB_OWNER');
      if (!canEmployerMoveApplication(application.currentStage, input.stage))
        throw new NativeApplicationError('INVALID_STAGE_TRANSITION');

      await transaction`
        UPDATE job_applications SET current_stage=${input.stage},updated_at=now()
        WHERE id=${input.applicationId}
      `;
      await transaction`
        INSERT INTO job_application_events (application_id,actor_id,event_type,stage_from,stage_to,note)
        VALUES (${input.applicationId},${input.ownerId},'STAGE_CHANGED',${application.currentStage},${input.stage},${input.note || null})
      `;
      await transaction`
        INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision)
        VALUES ('HUMAN',${input.ownerId},${application.candidateId},'JOB_APPLICATION_STAGE_CHANGED',
          'JOB_APPLICATION',${input.applicationId},${randomUUID()},'SUCCESS','POSTING_OWNER_AUTHORIZED')
      `;
      return {
        candidateId: application.candidateId,
        jobSlug: application.jobSlug,
        jobTitle: application.jobTitle,
      };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
  // Notifications are outside the transition transaction so a user's preferences or inbox cannot
  // prevent the durable stage update. The durable change remains successful if notification
  // delivery fails, but the failure is recorded in structured observability output.
  try {
    await createStageNotification({ ...notification, stage: input.stage });
  } catch {
    logger.error({
      operation: 'job_application_stage_notification',
      outcome: 'failure',
      errorCode: 'NOTIFICATION_DELIVERY_FAILED',
    });
  }
}
