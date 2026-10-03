'use client';

import { useState, type FormEvent } from 'react';

export function ModerationApplicationForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setStatus(null);
    try {
      const response = await fetch('/api/moderation/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          motivation: form.get('motivation'),
          relevantExperience: form.get('relevantExperience') || undefined,
          weeklyAvailability: form.get('weeklyAvailability'),
          agreesToCode: form.get('agreesToCode') === 'on',
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setStatus(
          body?.error === 'APPLICATION_ALREADY_OPEN'
            ? 'You already have an active volunteer moderation application.'
            : 'Your application could not be submitted. Check the required fields and try again.',
        );
        return;
      }
      event.currentTarget.reset();
      setStatus(
        'Application received. A VouchNet administrator will review it before any role is assigned.',
      );
    } catch {
      setStatus(
        'The network is unavailable. Your application was not submitted. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="moderation-form" onSubmit={submit}>
      <label>
        Why do you want to help moderate VouchNet?
        <textarea name="motivation" minLength={40} maxLength={2_000} required />
      </label>
      <label>
        Relevant experience <small>Optional</small>
        <textarea name="relevantExperience" maxLength={2_000} />
      </label>
      <label>
        Typical weekly availability
        <input
          name="weeklyAvailability"
          maxLength={280}
          placeholder="For example: 2–4 hours, evenings ET"
          required
        />
      </label>
      <label className="moderation-check">
        <input name="agreesToCode" required type="checkbox" />
        <span>
          I will follow the volunteer moderation principles and keep private reports confidential.
        </span>
      </label>
      <button className="primary-button" disabled={submitting} type="submit">
        {submitting ? 'Submitting…' : 'Apply as a volunteer moderator'}
      </button>
      {status !== null ? <p role="status">{status}</p> : null}
    </form>
  );
}
