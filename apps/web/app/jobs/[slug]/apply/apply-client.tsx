'use client';

import { FormEvent, useState } from 'react';

export function NativeApplyClient({ slug, title }: { slug: string; title: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/jobs/${slug}/applications`, {
        body: JSON.stringify({
          coverNote: new FormData(event.currentTarget).get('coverNote') ?? '',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });
      const body = (await response.json()) as { error?: { code?: string }; success?: boolean };
      setMessage(
        body.success
          ? 'Application submitted. Track updates in your Application Radar.'
          : body.error?.code === 'ALREADY_APPLIED'
            ? 'You already applied to this role.'
            : 'Your application could not be submitted.',
      );
    } catch {
      setMessage('Your application could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <form className="native-apply-form" onSubmit={(event) => void submit(event)}>
      <p className="eyebrow">Native application</p>
      <h1>Apply to {title}</h1>
      <p>
        Your verified VouchNet profile is attached to this application. Add context if it helps the
        hiring team.
      </p>
      <label>
        Optional note
        <textarea maxLength={4000} name="coverNote" rows={8} />
      </label>
      <button className="primary" disabled={submitting} type="submit">
        {submitting ? 'Submitting…' : 'Submit application'}
      </button>
      {message === null ? null : <p className="form-error">{message}</p>}
    </form>
  );
}
