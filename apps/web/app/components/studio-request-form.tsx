'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { studioPackages } from '../lib/studio-config';

const fields = [
  ['goals', 'Project goals', 'What must this project accomplish?'],
  ['currentSiteProblems', 'Current-site problems', 'What is not working today?'],
  ['desiredPages', 'Desired pages', 'List the pages, flows, and information architecture.'],
  [
    'functionality',
    'Required functionality',
    'Describe interactions, integrations, user roles, and data needs.',
  ],
  ['visualPreferences', 'Visual direction', 'Describe tone, visual preferences, and references.'],
  [
    'requirements',
    'Accessibility, SEO, CMS, and hosting requirements',
    'State the specific requirements, constraints, and compliance needs.',
  ],
  [
    'acceptanceCriteria',
    'Acceptance criteria',
    'Define how both sides will know the work is complete.',
  ],
] as const;

export function StudioRequestForm() {
  const router = useRouter();
  const [packageId, setPackageId] = useState<keyof typeof studioPackages>('FOUNDATION');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    const form = event.currentTarget;
    const response = await fetch('/api/studio/requests', {
      method: 'POST',
      body: new FormData(form),
    });
    const payload = (await response.json().catch(() => null)) as {
      success?: boolean;
      requestId?: string;
      requiresQuote?: boolean;
      error?: { message?: string };
    } | null;
    if (!response.ok || payload?.success !== true || payload.requestId === undefined) {
      setStatus(
        payload?.error?.message ??
          'Your brief could not be saved. Please review the required fields.',
      );
      setBusy(false);
      return;
    }
    if (payload.requiresQuote) {
      router.push('/studio/projects?quote=pending');
      return;
    }
    const checkout = await fetch(`/api/studio/requests/${payload.requestId}/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const checkoutPayload = (await checkout.json().catch(() => null)) as { url?: string } | null;
    if (!checkout.ok || checkoutPayload?.url === undefined) {
      setStatus(
        'Your brief was saved, but checkout is unavailable. You can retry from your Studio dashboard.',
      );
      setBusy(false);
      return;
    }
    window.location.assign(checkoutPayload.url);
  }
  return (
    <form className="studio-form" onSubmit={submit} encType="multipart/form-data">
      <input name="packageId" type="hidden" value={packageId} />
      <div className="studio-form-grid">
        <label>
          Full name
          <input name="customerName" autoComplete="name" required minLength={2} maxLength={120} />
        </label>
        <label>
          Contact email
          <input name="contactEmail" type="email" autoComplete="email" required />
        </label>
        <label>
          Business or organization
          <input name="businessName" maxLength={160} />
        </label>
        <label>
          Existing website
          <input name="websiteUrl" type="url" placeholder="https://" />
        </label>
        <label>
          Service requested
          <input
            name="serviceType"
            required
            minLength={3}
            placeholder="e.g. product website redesign"
          />
        </label>
        <label>
          Budget range
          <input name="budget" required placeholder="e.g. $5,000–$8,000" />
        </label>
        <label>
          Desired completion date
          <input name="desiredCompletionDate" type="date" />
        </label>
        <label>
          Preferred technologies
          <input name="preferredTechnologies" placeholder="Optional" />
        </label>
      </div>
      <fieldset>
        <legend>Select a deposit package</legend>
        <div className="studio-package-grid">
          {Object.entries(studioPackages).map(([id, item]) => (
            <label
              className={packageId === id ? 'studio-package selected' : 'studio-package'}
              key={id}
            >
              <input
                type="radio"
                value={id}
                checked={packageId === id}
                onChange={() => setPackageId(id as keyof typeof studioPackages)}
              />
              <strong>{item.name}</strong>
              <span>{item.detail}</span>
              <b>
                {item.depositCents === null
                  ? 'Written quote first'
                  : `$${(item.depositCents / 100).toLocaleString()} deposit`}
              </b>
            </label>
          ))}
        </div>
      </fieldset>
      {fields.map(([name, label, hint]) => (
        <label className="studio-textarea" key={name}>
          {label}
          <span>{hint}</span>
          <textarea
            name={name}
            required
            minLength={name === 'goals' || name === 'acceptanceCriteria' ? 40 : 20}
            maxLength={8_000}
          />
        </label>
      ))}
      <div className="studio-form-grid">
        <label>
          Reference websites
          <input name="referenceWebsites" placeholder="Optional URLs, one per line" />
        </label>
        <label>
          Additional instructions
          <input name="additionalInstructions" placeholder="Optional" />
        </label>
      </div>
      <label className="studio-upload">
        Private supporting files{' '}
        <span>PDF, DOCX, PNG, or JPG · up to 5 files · 10 MB each · 25 MB total</span>
        <input
          name="attachments"
          type="file"
          multiple
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
        />
      </label>
      <p className="studio-required-note">
        A technical scope, functional requirements, and acceptance criteria are required. Incomplete
        briefs cannot be submitted.
      </p>
      {status === null ? null : (
        <p className="form-error" role="alert">
          {status}
        </p>
      )}
      <button className="primary-button" disabled={busy} type="submit">
        {busy
          ? 'Saving secure brief…'
          : packageId === 'CUSTOM'
            ? 'Request a written quote'
            : `Continue to ${studioPackages[packageId].depositCents === null ? 'quote' : 'secure deposit'}`}
      </button>
    </form>
  );
}
