'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useState } from 'react';
import { buttonClassName } from '../components/ui/button';
import { ProjectFormDialog, type ProjectFormValues } from './project-form';

const errorCopy: Record<string, string> = {
  OWNER_CANNOT_FOLLOW: 'You own this project, so its updates already reach you.',
  BLOCKED_RELATIONSHIP: 'This action is unavailable.',
  PROFILE_UNAVAILABLE: 'No active member has that profile handle.',
  ALREADY_INVITED: 'That member already has a pending invitation.',
  ALREADY_CONTRIBUTOR: 'That member is already a contributor.',
  RECENTLY_DECLINED: 'That member declined recently. You can invite them again later.',
  CANNOT_INVITE_OWNER: 'You are already the owner of this project.',
  CONTRIBUTOR_LIMIT: 'This project has reached its contributor limit.',
  PENDING_INVITE_LIMIT: 'Resolve some pending invitations before sending more.',
  BUILD_LOG_RATE_LIMITED: 'You have posted the daily maximum of build-log entries.',
  RATE_LIMITED: 'Too many changes in a short time. Wait a moment and try again.',
  INVALID_INPUT: 'Check the highlighted fields and try again.',
};

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return (body.error !== undefined ? errorCopy[body.error] : undefined) ?? fallback;
  } catch {
    return fallback;
  }
}

export function FollowProjectButton({
  projectId,
  initialFollowing,
  initialCount,
}: {
  projectId: string;
  initialFollowing: boolean;
  initialCount: number;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function toggle() {
    const next = !following;
    setWorking(true);
    setError(null);
    setFollowing(next);
    setCount((value) => value + (next ? 1 : -1));
    try {
      const response = await fetch(`/api/projects/${projectId}/follow`, {
        method: next ? 'POST' : 'DELETE',
      });
      if (!response.ok) throw new Error(await readError(response, 'Could not update following.'));
      const body = (await response.json()) as { following: boolean; followerCount: number };
      setFollowing(body.following);
      setCount(body.followerCount);
    } catch (caught) {
      setFollowing(!next);
      setCount((value) => value + (next ? -1 : 1));
      setError(caught instanceof Error ? caught.message : 'Could not update following.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="relationship-actions">
      <button
        type="button"
        className={buttonClassName({ variant: following ? 'secondary' : 'primary', size: 'sm' })}
        aria-pressed={following}
        disabled={working}
        onClick={() => void toggle()}
      >
        {following ? 'Following' : 'Follow project'}
      </button>
      <span className="muted-copy">{count === 1 ? '1 follower' : `${count} followers`}</span>
      {error === null ? null : (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ContributionResponse({
  projectId,
  contributorId,
  mode,
}: {
  projectId: string;
  contributorId: string;
  mode: 'invite' | 'leave' | 'remove';
}) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'working' | 'error'>('idle');

  async function respond(action: 'ACCEPT' | 'DECLINE' | 'LEAVE' | 'REMOVE') {
    setState('working');
    try {
      const response = await fetch(`/api/projects/${projectId}/contributors/${contributorId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error();
      setState('idle');
      router.refresh();
    } catch {
      setState('error');
    }
  }

  return (
    <div className="relationship-actions">
      {mode === 'invite' ? (
        <>
          <button
            className={buttonClassName({ size: 'sm' })}
            type="button"
            disabled={state === 'working'}
            onClick={() => void respond('ACCEPT')}
          >
            Accept
          </button>
          <button
            className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            type="button"
            disabled={state === 'working'}
            onClick={() => void respond('DECLINE')}
          >
            Decline
          </button>
        </>
      ) : (
        <button
          className="text-action"
          type="button"
          disabled={state === 'working'}
          onClick={() => void respond(mode === 'leave' ? 'LEAVE' : 'REMOVE')}
        >
          {mode === 'leave' ? 'Leave project' : 'Remove'}
        </button>
      )}
      {state === 'error' ? (
        <p className="form-error" role="alert">
          Could not update this contribution.
        </p>
      ) : null}
    </div>
  );
}

export function BuildLogComposer({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/logs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: form.get('title'), body: form.get('body') }),
      });
      if (!response.ok)
        throw new Error(await readError(response, 'The entry could not be posted.'));
      formElement.reset();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The entry could not be posted.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <form className="build-log-composer" onSubmit={(event) => void submit(event)}>
      <label>
        What changed?
        <input
          name="title"
          required
          minLength={3}
          maxLength={120}
          placeholder="Shipped offline sync"
        />
      </label>
      <label>
        Details
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={4000}
          placeholder="What you built, what you learned, and what is next."
        />
      </label>
      {error === null ? null : (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div>
        <button className={buttonClassName({ size: 'sm' })} disabled={working}>
          {working ? 'Posting…' : 'Post to build log'}
        </button>
      </div>
    </form>
  );
}

export function DeleteBuildLogButton({ projectId, logId }: { projectId: string; logId: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  return (
    <button
      className="text-action"
      type="button"
      disabled={working}
      onClick={() => {
        if (!window.confirm('Delete this build-log entry?')) return;
        setWorking(true);
        void fetch(`/api/projects/${projectId}/logs/${logId}`, { method: 'DELETE' })
          .then(() => router.refresh())
          .finally(() => setWorking(false));
      }}
    >
      Delete
    </button>
  );
}

export function InviteContributorForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setWorking(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/contributors`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          profileSlug: String(form.get('profileSlug') ?? '')
            .trim()
            .replace(/^@/, ''),
          role: form.get('role'),
        }),
      });
      if (!response.ok)
        throw new Error(await readError(response, 'The invitation could not be sent.'));
      formElement.reset();
      setMessage({ tone: 'ok', text: 'Invitation sent. They will see it on their Projects page.' });
      router.refresh();
    } catch (caught) {
      setMessage({
        tone: 'error',
        text: caught instanceof Error ? caught.message : 'The invitation could not be sent.',
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <form className="build-log-composer" onSubmit={(event) => void submit(event)}>
      <label>
        Profile handle
        <input name="profileSlug" required minLength={3} maxLength={40} placeholder="maya-chen" />
      </label>
      <label>
        Role
        <input name="role" required minLength={2} maxLength={60} placeholder="Design lead" />
      </label>
      {message === null ? null : (
        <p className={message.tone === 'error' ? 'form-error' : 'muted-copy'} role="status">
          {message.text}
        </p>
      )}
      <div>
        <button
          className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          disabled={working}
        >
          {working ? 'Sending…' : 'Invite contributor'}
        </button>
      </div>
    </form>
  );
}

export function EditProjectButton({ project }: { project: ProjectFormValues }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        className={buttonClassName({ variant: 'secondary', size: 'sm' })}
        onClick={() => setOpen(true)}
      >
        Edit project
      </button>
      {open ? <ProjectFormDialog initial={project} onClose={close} /> : null}
    </>
  );
}
