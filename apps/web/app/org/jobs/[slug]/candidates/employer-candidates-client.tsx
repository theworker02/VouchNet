'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  canEmployerMoveApplication,
  employerApplicationStages,
} from '../../../../lib/application-stages';
import type {
  EmployerApplication,
  EmployerApplicationJob,
} from '../../../../lib/native-applications';

type ClientApplication = Omit<EmployerApplication, 'createdAt'> & { createdAt: string };

const stageLabel = (stage: string) =>
  stage
    .toLowerCase()
    .split('_')
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');

export function EmployerCandidatesClient({
  applications,
  job,
}: {
  applications: ClientApplication[];
  job: EmployerApplicationJob;
}) {
  const [items, setItems] = useState(applications);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function move(
    application: ClientApplication,
    nextStage: (typeof employerApplicationStages)[number],
  ) {
    if (!canEmployerMoveApplication(application.currentStage, nextStage)) return;
    const before = application.currentStage;
    setPendingId(application.id);
    setFeedback(null);
    setItems((current) =>
      current.map((item) =>
        item.id === application.id ? { ...item, currentStage: nextStage } : item,
      ),
    );
    try {
      const response = await fetch(
        `/api/org/jobs/${encodeURIComponent(job.slug)}/applications/${application.id}/stage`,
        {
          body: JSON.stringify({ stage: nextStage }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        },
      );
      if (!response.ok) throw new Error('APPLICATION_STAGE_UPDATE_FAILED');
      setFeedback(`${application.candidateName} moved to ${stageLabel(nextStage)}.`);
    } catch {
      setItems((current) =>
        current.map((item) =>
          item.id === application.id ? { ...item, currentStage: before } : item,
        ),
      );
      setFeedback('The candidate stage could not be updated. Nothing was changed.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="candidate-pipeline">
      <header className="candidate-pipeline-heading">
        <div>
          <p className="eyebrow">Employer candidate pipeline</p>
          <h1>{job.title}</h1>
          <p>{job.organizationName} · candidates who applied through VouchNet.</p>
        </div>
        <Link className="secondary" href="/jobs/post">
          Employer workspace
        </Link>
      </header>
      <p className="candidate-pipeline-notice">
        Stage changes are recorded, attributed to you, and delivered as an in-app update when a
        candidate has enabled job notifications.
      </p>
      {feedback === null ? null : (
        <p className="employer-feedback" role="status">
          {feedback}
        </p>
      )}
      {items.length === 0 ? (
        <section className="candidate-pipeline-empty">
          <h2>No applications yet</h2>
          <p>
            When a candidate applies with VouchNet, their submitted profile context appears here.
          </p>
        </section>
      ) : (
        <div className="candidate-pipeline-list">
          {items.map((application) => {
            const nextStages = employerApplicationStages.filter((stage) =>
              canEmployerMoveApplication(application.currentStage, stage),
            );
            return (
              <article className="candidate-pipeline-card" key={application.id}>
                <div className="candidate-card-main">
                  <div>
                    <Link href={`/vouch/${application.candidateSlug}`}>
                      {application.candidateName}
                    </Link>
                    <span>{application.candidateHeadline ?? 'VouchNet member'}</span>
                    {application.candidateLocation === null ? null : (
                      <small>{application.candidateLocation}</small>
                    )}
                  </div>
                  <time dateTime={application.createdAt}>
                    Applied{' '}
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                      new Date(application.createdAt),
                    )}
                  </time>
                </div>
                {application.coverNote === '' ? null : (
                  <p className="candidate-cover-note">{application.coverNote}</p>
                )}
                <footer>
                  <span className="application-stage">{stageLabel(application.currentStage)}</span>
                  {nextStages.length === 0 ? (
                    <span className="candidate-stage-final">Final stage</span>
                  ) : (
                    <label>
                      <span className="sr-only">
                        Move {application.candidateName} to a new stage
                      </span>
                      <select
                        defaultValue=""
                        disabled={pendingId === application.id}
                        onChange={(event) => {
                          const stage = event.target
                            .value as (typeof employerApplicationStages)[number];
                          event.target.value = '';
                          void move(application, stage);
                        }}
                      >
                        <option disabled value="">
                          {pendingId === application.id ? 'Updating…' : 'Move to…'}
                        </option>
                        {nextStages.map((stage) => (
                          <option key={stage} value={stage}>
                            {stageLabel(stage)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
