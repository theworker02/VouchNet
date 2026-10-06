'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { buttonClassName } from '../components/ui/button';
import type { OpportunityStatus, ProposalStatus } from '../lib/opportunity-model';
import { readOpportunityError } from './opportunity-errors';

async function send(url: string, method: 'POST' | 'PATCH', body: unknown, fallback: string) {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response === null) throw new Error('The network is unavailable. Try again.');
  if (!response.ok) throw new Error(await readOpportunityError(response, fallback));
}

function ErrorLine({ error }: { error: string | null }) {
  return error === null ? null : (
    <p className="form-error" role="alert">
      {error}
    </p>
  );
}

export function OpportunityStatusControls({
  opportunityId,
  status,
}: {
  opportunityId: string;
  status: OpportunityStatus;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: OpportunityStatus) {
    if (
      next === 'WITHDRAWN' &&
      !window.confirm('Withdraw this opportunity? This cannot be undone.')
    )
      return;
    setWorking(true);
    setError(null);
    try {
      await send(
        `/api/opportunities/${opportunityId}`,
        'PATCH',
        { status: next },
        'The status could not be changed.',
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The status could not be changed.');
    } finally {
      setWorking(false);
    }
  }

  if (status === 'WITHDRAWN' || status === 'FILLED') return null;
  const secondary = buttonClassName({ variant: 'secondary', size: 'sm' });
  return (
    <div className="relationship-actions">
      {status === 'CLOSED' ? (
        <button
          className={buttonClassName({ size: 'sm' })}
          type="button"
          disabled={working}
          onClick={() => void change('OPEN')}
        >
          Reopen
        </button>
      ) : (
        <button
          className={secondary}
          type="button"
          disabled={working}
          onClick={() => void change('CLOSED')}
        >
          Close
        </button>
      )}
      <button
        className={secondary}
        type="button"
        disabled={working}
        onClick={() => void change('FILLED')}
      >
        Mark filled
      </button>
      <button
        className="text-action"
        type="button"
        disabled={working}
        onClick={() => void change('WITHDRAWN')}
      >
        Withdraw
      </button>
      <ErrorLine error={error} />
    </div>
  );
}

export function ProposalForm({
  opportunityId,
  projects,
}: {
  opportunityId: string;
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [length, setLength] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => {
      const value = String(form.get(name) ?? '').trim();
      return value === '' ? null : value;
    };
    const budget = text('proposedBudget');
    setWorking(true);
    setError(null);
    try {
      await send(
        `/api/opportunities/${opportunityId}/proposals`,
        'POST',
        {
          message: String(form.get('message') ?? ''),
          proposedBudget: budget === null ? null : Math.round(Number(budget)),
          timeline: text('timeline'),
          portfolioUrl: text('portfolioUrl'),
          projectId: text('projectId'),
        },
        'Your proposal could not be sent.',
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your proposal could not be sent.');
      setWorking(false);
    }
  }

  return (
    <form
      className="build-log-composer opportunity-proposal-form"
      onSubmit={(event) => void submit(event)}
    >
      <label>
        Your proposal
        <textarea
          name="message"
          required
          minLength={80}
          maxLength={4000}
          placeholder="How you would approach it, relevant work you have shipped, and questions you have."
          onChange={(event) => setLength(event.target.value.trim().length)}
        />
        <small className="muted-copy" aria-live="polite">
          {length < 80 ? `${80 - length} more characters needed` : `${length}/4000`}
        </small>
      </label>
      <div className="opportunity-proposal-grid">
        <label>
          Proposed budget <small>Optional</small>
          <input name="proposedBudget" type="number" min={0} />
        </label>
        <label>
          Timeline <small>Optional</small>
          <input name="timeline" maxLength={200} placeholder="Six weeks, part-time" />
        </label>
      </div>
      <div className="opportunity-proposal-grid">
        <label>
          Portfolio link <small>Optional, https://</small>
          <input name="portfolioUrl" type="url" maxLength={500} placeholder="https://" />
        </label>
        <label>
          Relevant project <small>Optional</small>
          <select name="projectId" defaultValue="">
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorLine error={error} />
      <div>
        <button className={buttonClassName({ size: 'sm' })} disabled={working}>
          {working ? 'Sending…' : 'Send proposal'}
        </button>
      </div>
    </form>
  );
}

export function ProposalReviewActions({
  opportunityId,
  proposalId,
  status,
}: {
  opportunityId: string;
  proposalId: string;
  status: ProposalStatus;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'SHORTLIST' | 'ACCEPT' | 'DECLINE') {
    setWorking(true);
    setError(null);
    try {
      await send(
        `/api/opportunities/${opportunityId}/proposals/${proposalId}`,
        'PATCH',
        { action },
        'That change could not be saved.',
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That change could not be saved.');
    } finally {
      setWorking(false);
    }
  }

  if (status !== 'SUBMITTED' && status !== 'SHORTLISTED') return null;
  return (
    <div className="relationship-actions">
      {status === 'SUBMITTED' ? (
        <button
          className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          type="button"
          disabled={working}
          onClick={() => void act('SHORTLIST')}
        >
          Shortlist
        </button>
      ) : null}
      <button
        className={buttonClassName({ size: 'sm' })}
        type="button"
        disabled={working}
        onClick={() => void act('ACCEPT')}
      >
        Accept
      </button>
      <button
        className="text-action"
        type="button"
        disabled={working}
        onClick={() => void act('DECLINE')}
      >
        Decline
      </button>
      <ErrorLine error={error} />
    </div>
  );
}

export function WithdrawProposalButton({
  opportunityId,
  proposalId,
}: {
  opportunityId: string;
  proposalId: string;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        className="text-action"
        type="button"
        disabled={working}
        onClick={() => {
          if (
            !window.confirm('Withdraw your proposal? You cannot send another for this opportunity.')
          )
            return;
          setWorking(true);
          send(
            `/api/opportunities/${opportunityId}/proposals/${proposalId}`,
            'PATCH',
            { action: 'WITHDRAW' },
            'Your proposal could not be withdrawn.',
          )
            .then(() => router.refresh())
            .catch((caught: unknown) => {
              setError(
                caught instanceof Error ? caught.message : 'Your proposal could not be withdrawn.',
              );
              setWorking(false);
            });
        }}
      >
        Withdraw proposal
      </button>
      <ErrorLine error={error} />
    </>
  );
}
