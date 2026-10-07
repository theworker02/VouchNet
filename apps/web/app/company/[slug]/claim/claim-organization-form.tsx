'use client';

import { useState } from 'react';
import { organizationClaimRelationships } from '../../../lib/organization-claim-schema';

const relationshipLabels: Record<(typeof organizationClaimRelationships)[number], string> = {
  FOUNDER: 'Founder or co-founder',
  EXECUTIVE: 'Executive or company officer',
  EMPLOYEE: 'Current employee',
  AUTHORIZED_REPRESENTATIVE: 'Authorized representative',
};

export function ClaimOrganizationForm({ slug }: { slug: string }) {
  const [relationship, setRelationship] =
    useState<(typeof organizationClaimRelationships)[number]>('FOUNDER');
  const [statement, setStatement] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setState('saving');
    setMessage(null);
    try {
      const response = await fetch(`/api/organizations/${slug}/claims`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ relationship, statement }),
      });
      if (response.ok) {
        setState('success');
        return;
      }
      const body: unknown = await response.json().catch(() => null);
      const code =
        typeof body === 'object' && body !== null && 'error' in body
          ? String(body.error)
          : 'UNKNOWN';
      setMessage(
        code === 'DOMAIN_EMAIL_REQUIRED'
          ? 'Use a verified VouchNet email at this organization’s website domain before submitting a claim.'
          : code === 'ALREADY_CLAIMED'
            ? 'This organization already has a verified owner. Contact its organization team instead.'
            : code === 'CLAIM_ALREADY_OPEN'
              ? 'You already have an open claim for this organization. A VouchNet administrator will review it.'
              : 'We could not submit this claim request. Please review the details and try again.',
      );
      setState('error');
    } catch {
      setMessage('We could not submit this claim request right now. Please try again later.');
      setState('error');
    }
  }

  if (state === 'success')
    return (
      <section className="claim-card">
        <p className="eyebrow">Claim submitted</p>
        <h1>Identity review required</h1>
        <p>
          Your verified company-domain email and declared relationship have been recorded for human
          review. No ownership has been granted yet, and VouchNet will not email anyone on your
          behalf.
        </p>
      </section>
    );

  return (
    <form
      className="claim-card"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <p className="eyebrow">Organization control request</p>
      <h1>Request to claim this organization</h1>
      <p>
        Claim review is intentionally strict. Your primary VouchNet email must already be verified
        and use the organization’s website domain. A person will review the request before any role
        is granted.
      </p>
      <label>
        Relationship to this organization
        <select
          value={relationship}
          onChange={(event) => setRelationship(event.target.value as typeof relationship)}
        >
          {organizationClaimRelationships.map((value) => (
            <option key={value} value={value}>
              {relationshipLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Why are you authorized to manage this page?
        <textarea
          required
          minLength={20}
          maxLength={2_400}
          rows={7}
          value={statement}
          onChange={(event) => setStatement(event.target.value)}
          placeholder="Describe your current relationship and why you are authorized to represent this organization."
        />
      </label>
      <p className="claim-safety-note">
        A matching name, an ordinary VouchNet account, or edits to public information never
        establish organization ownership. Claims are not promotional outreach and are not
        automatically approved.
      </p>
      {message === null ? null : <p className="form-error">{message}</p>}
      <button className="primary" type="submit" disabled={state === 'saving'}>
        {state === 'saving' ? 'Submitting claim…' : 'Submit for human review'}
      </button>
    </form>
  );
}
