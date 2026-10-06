'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { profileIntentLabels, profileIntents, type ProfileIntent } from '../lib/profile-intent';

/** Lets a member say what they are open to right now; shown on their profile and discovery cards. */
export function IntentSelect({ initialIntent }: { initialIntent: ProfileIntent | null }) {
  const router = useRouter();
  const id = useId();
  const [intent, setIntent] = useState<ProfileIntent | null>(initialIntent);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function save(next: ProfileIntent | null) {
    const previous = intent;
    setIntent(next);
    setMessage(null);
    startSaving(async () => {
      try {
        const response = await fetch('/api/profile/intent', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ intent: next }),
        });
        if (!response.ok) throw new Error('failed');
        setMessage(next === null ? 'Cleared' : 'Saved');
        router.refresh();
      } catch {
        setIntent(previous);
        setMessage('Could not save. Try again.');
      }
    });
  }

  return (
    <div className="discover-intent">
      <label htmlFor={id}>Your current intent</label>
      <select
        id={id}
        value={intent ?? ''}
        disabled={saving}
        aria-describedby={`${id}-hint`}
        onChange={(event) =>
          save(event.target.value === '' ? null : (event.target.value as ProfileIntent))
        }
      >
        <option value="">Not set</option>
        {profileIntents.map((value) => (
          <option key={value} value={value}>
            {profileIntentLabels[value]}
          </option>
        ))}
      </select>
      <small id={`${id}-hint`}>
        Shown on your profile and discovery card.{' '}
        <span role="status" aria-live="polite">
          {saving ? 'Saving…' : message}
        </span>
      </small>
    </div>
  );
}
