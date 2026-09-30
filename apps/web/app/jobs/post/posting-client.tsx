'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type Dashboard = {
  sources: Array<{
    createdAt: string;
    id: string;
    lastSyncedAt: string | null;
    provider: 'GREENHOUSE' | 'LEVER';
    status: 'PENDING_REVIEW' | 'ACTIVE' | 'PAUSED' | 'REJECTED';
  }>;
  submissions: Array<{
    createdAt: string;
    employerReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    freeUntil: string | null;
    id: string;
    organizationName: string;
    title: string;
  }>;
  trialEndsAt: string | null;
};

type Mode = 'MANUAL' | 'SOURCE';

const feedbackByError: Record<string, string> = {
  CSRF_REJECTED: 'This form must be submitted from VouchNet. Refresh the page and try again.',
  DUPLICATE_JOB: 'This application URL is already in the employer review queue.',
  DUPLICATE_SOURCE: 'That public job board is already registered for review.',
  FREE_WINDOW_EXPIRED:
    'Your free two-calendar-month launch window has ended. New postings are paused until a paid plan is available.',
  INVALID_JOB_SOURCE: 'Check the organization website, provider, and public board token.',
  INVALID_JOB_SUBMISSION:
    'Please complete the required role details and check the compensation range.',
  UNAUTHENTICATED: 'Your session has expired. Sign in again to post a role.',
};

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? '').trim();
  return text === '' ? null : Number(text);
}

function dateLabel(value: string | null): string {
  return value === null
    ? 'Starts when your first role or source is submitted'
    : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
}

export function JobPostingClient({ initialDashboard }: { initialDashboard: Dashboard }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('MANUAL');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitManualJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/jobs/submissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        applicationUrl: form.get('applicationUrl'),
        description: form.get('description'),
        employmentType: form.get('employmentType'),
        location: form.get('location'),
        organizationName: form.get('organizationName'),
        organizationWebsite: form.get('organizationWebsite'),
        salaryCurrency: form.get('salaryCurrency'),
        salaryMax: optionalNumber(form.get('salaryMax')),
        salaryMin: optionalNumber(form.get('salaryMin')),
        skillTags: String(form.get('skillTags') ?? '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        summary: form.get('summary'),
        title: form.get('title'),
        workplaceType: form.get('workplaceType'),
      }),
    });
    setSubmitting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: 'JOB_SUBMISSION_FAILED' }))) as {
        error?: string;
      };
      setMessage(
        feedbackByError[body.error ?? ''] ?? 'The role could not be submitted. Try again.',
      );
      return;
    }
    setMessage('Role received. It is pending employer verification and VouchNet review.');
    event.currentTarget.reset();
    router.refresh();
  }

  async function submitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/jobs/sources', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        boardToken: form.get('boardToken'),
        organizationName: form.get('organizationName'),
        organizationWebsite: form.get('organizationWebsite'),
        provider: form.get('provider'),
      }),
    });
    setSubmitting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: 'JOB_SOURCE_CREATE_FAILED' }))) as {
        error?: string;
      };
      setMessage(
        feedbackByError[body.error ?? ''] ?? 'The source could not be registered. Try again.',
      );
      return;
    }
    setMessage(
      'Public board received. We will validate ownership and activate an approved source.',
    );
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <section className="employer-workspace">
      <header className="employer-heading">
        <div>
          <p className="eyebrow">Employer launch</p>
          <h1>Post work with the context candidates deserve.</h1>
          <p>
            Submit a direct opening or connect a public Greenhouse or Lever board. We preserve the
            original source, require review, and never turn an unverified listing into a public job.
          </p>
        </div>
        <aside className="employer-trial-card">
          <span>Founding employer window</span>
          <strong>{dateLabel(initialDashboard.trialEndsAt)}</strong>
          <p>
            No card required. You will never be charged automatically after the two-month window.
          </p>
        </aside>
      </header>

      <div className="employer-mode-switch" role="tablist" aria-label="Posting method">
        <button
          aria-selected={mode === 'MANUAL'}
          className={mode === 'MANUAL' ? 'is-active' : undefined}
          role="tab"
          type="button"
          onClick={() => setMode('MANUAL')}
        >
          Post one role
        </button>
        <button
          aria-selected={mode === 'SOURCE'}
          className={mode === 'SOURCE' ? 'is-active' : undefined}
          role="tab"
          type="button"
          onClick={() => setMode('SOURCE')}
        >
          Connect a job board
        </button>
      </div>

      {mode === 'MANUAL' ? (
        <form className="employer-form" onSubmit={(event) => void submitManualJob(event)}>
          <div className="employer-form-section">
            <span>01</span>
            <div>
              <h2>Employer and role</h2>
              <div className="two">
                <label>
                  Organization name
                  <input name="organizationName" required maxLength={160} />
                </label>
                <label>
                  Organization website
                  <input name="organizationWebsite" required placeholder="https://" type="url" />
                </label>
              </div>
              <div className="two">
                <label>
                  Job title
                  <input name="title" required maxLength={160} />
                </label>
                <label>
                  Application URL
                  <input name="applicationUrl" required placeholder="https://" type="url" />
                </label>
              </div>
              <label>
                Clear role summary
                <textarea name="summary" required minLength={30} maxLength={600} />
              </label>
            </div>
          </div>
          <div className="employer-form-section">
            <span>02</span>
            <div>
              <h2>Work conditions and compensation</h2>
              <div className="three">
                <label>
                  Location
                  <input
                    name="location"
                    required
                    placeholder="Remote · United States"
                    maxLength={160}
                  />
                </label>
                <label>
                  Workplace
                  <select defaultValue="REMOTE" name="workplaceType">
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">On-site</option>
                  </select>
                </label>
                <label>
                  Employment type
                  <select defaultValue="FULL_TIME" name="employmentType">
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </label>
              </div>
              <div className="three">
                <label>
                  Salary minimum <small>Optional, but clearly flagged when omitted</small>
                  <input min="1" name="salaryMin" type="number" />
                </label>
                <label>
                  Salary maximum
                  <input min="1" name="salaryMax" type="number" />
                </label>
                <label>
                  Currency
                  <input defaultValue="USD" maxLength={3} name="salaryCurrency" required />
                </label>
              </div>
            </div>
          </div>
          <div className="employer-form-section">
            <span>03</span>
            <div>
              <h2>What candidates should understand</h2>
              <label>
                Role details, scope, and interview context
                <textarea name="description" required minLength={80} maxLength={12_000} />
              </label>
              <label>
                Relevant skills <small>Comma-separated, up to 12</small>
                <input name="skillTags" placeholder="TypeScript, PostgreSQL, accessibility" />
              </label>
            </div>
          </div>
          <footer>
            <p>
              Submissions are held for verification and review. Your launch window is free through
              {` ${dateLabel(initialDashboard.trialEndsAt)}.`}
            </p>
            <button disabled={submitting} type="submit">
              {submitting ? 'Submitting…' : 'Submit role for review'}
            </button>
          </footer>
        </form>
      ) : (
        <form
          className="employer-form employer-source-form"
          onSubmit={(event) => void submitSource(event)}
        >
          <div className="employer-form-section">
            <span>01</span>
            <div>
              <h2>Public ATS source</h2>
              <p>
                VouchNet supports the published Greenhouse Job Board API and Lever Postings API. We
                only ingest a board after a human ownership review.
              </p>
              <div className="two">
                <label>
                  Organization name
                  <input name="organizationName" required maxLength={160} />
                </label>
                <label>
                  Organization website
                  <input name="organizationWebsite" required placeholder="https://" type="url" />
                </label>
              </div>
              <div className="two">
                <label>
                  Provider
                  <select defaultValue="GREENHOUSE" name="provider">
                    <option value="GREENHOUSE">Greenhouse Job Board</option>
                    <option value="LEVER">Lever Postings</option>
                  </select>
                </label>
                <label>
                  Public board token
                  <input
                    name="boardToken"
                    required
                    placeholder="your-company"
                    pattern="[A-Za-z0-9_-]{2,100}"
                  />
                </label>
              </div>
            </div>
          </div>
          <footer>
            <p>Use only a board you operate or are explicitly authorized to represent.</p>
            <button disabled={submitting} type="submit">
              {submitting ? 'Registering…' : 'Register source for review'}
            </button>
          </footer>
        </form>
      )}

      {message === null ? null : (
        <p className="employer-feedback" role="status">
          {message}
        </p>
      )}

      <section className="employer-activity" aria-label="Employer posting activity">
        <div>
          <h2>Role submissions</h2>
          {initialDashboard.submissions.length === 0 ? (
            <p>No role submissions yet.</p>
          ) : (
            <ul>
              {initialDashboard.submissions.map((submission) => (
                <li key={submission.id}>
                  <span>
                    <strong>{submission.title}</strong>
                    <small>{submission.organizationName}</small>
                  </span>
                  <em>{submission.employerReviewStatus.toLowerCase().replace('_', ' ')}</em>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2>Connected sources</h2>
          {initialDashboard.sources.length === 0 ? (
            <p>No provider sources registered.</p>
          ) : (
            <ul>
              {initialDashboard.sources.map((source) => (
                <li key={source.id}>
                  <span>
                    <strong>{source.provider === 'GREENHOUSE' ? 'Greenhouse' : 'Lever'}</strong>
                    <small>Submitted {dateLabel(source.createdAt)}</small>
                  </span>
                  <em>{source.status.toLowerCase().replace('_', ' ')}</em>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </section>
  );
}
