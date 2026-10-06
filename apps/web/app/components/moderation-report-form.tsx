'use client';

import { useState, type FormEvent } from 'react';

const categories = [
  ['SPAM', 'Spam or manipulation'],
  ['HARASSMENT', 'Harassment or abuse'],
  ['IMPERSONATION', 'Impersonation'],
  ['SAFETY', 'Safety concern'],
  ['PRIVACY', 'Privacy concern'],
  ['OTHER', 'Other policy concern'],
] as const;

export function ModerationReportForm({ initialPath }: { initialPath?: string | undefined } = {}) {
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setStatus(null);
    try {
      const response = await fetch('/api/moderation/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subjectPath: form.get('subjectPath'),
          category: form.get('category'),
          details: form.get('details'),
        }),
      });
      if (!response.ok) {
        setStatus(
          'Your report could not be submitted. Use a VouchNet path and include enough context.',
        );
        return;
      }
      event.currentTarget.reset();
      setStatus(
        'Report received. A human reviewer will evaluate it; submitting a report does not automatically remove content.',
      );
    } catch {
      setStatus('The network is unavailable. Your report was not submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="moderation-form" onSubmit={submit}>
      <label>
        VouchNet page or content path
        <input
          name="subjectPath"
          defaultValue={initialPath}
          pattern="/[^\s]*"
          placeholder="/vouch/member-name or /feed"
          required
        />
      </label>
      <label>
        Concern category
        <select defaultValue="SPAM" name="category">
          {categories.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        What should a reviewer know?
        <textarea name="details" minLength={20} maxLength={2_000} required />
      </label>
      <button className="primary-button" disabled={submitting} type="submit">
        {submitting ? 'Sending…' : 'Submit report'}
      </button>
      {status !== null ? <p role="status">{status}</p> : null}
    </form>
  );
}
