'use client';

import { useState } from 'react';

interface OnboardingFormProps {
  headline: string;
  location: string;
  about: string;
  onboardingStep: number;
}

export function OnboardingForm({ headline, location, about, onboardingStep }: OnboardingFormProps) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/profile/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        headline: String(form.get('headline') ?? ''),
        location: String(form.get('location') ?? ''),
        about: String(form.get('about') ?? ''),
        onboardingStep: 10,
      }),
    });
    setStatus(response.ok ? 'saved' : 'error');
  }
  return (
    <form className="onboarding-form" onSubmit={(event) => void save(event)}>
      <label>
        Headline
        <input
          name="headline"
          defaultValue={headline}
          maxLength={220}
          placeholder="What do you do?"
        />
      </label>
      <label>
        Location
        <input
          name="location"
          defaultValue={location}
          maxLength={160}
          placeholder="City, region, or remote"
        />
      </label>
      <label>
        About
        <textarea
          name="about"
          defaultValue={about}
          maxLength={3000}
          placeholder="Share the work, interests, or opportunities that matter to you."
        />
      </label>
      <button disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : 'Save profile'}
      </button>
      {status === 'saved' ? <p className="action-feedback">Your profile has been saved.</p> : null}
      {status === 'error' ? (
        <p className="form-error">Your changes could not be saved. Please try again.</p>
      ) : null}
      {onboardingStep === 10 ? (
        <p className="onboarding-note">
          You have completed the currently available onboarding steps. You can return any time to
          update them.
        </p>
      ) : null}
    </form>
  );
}
