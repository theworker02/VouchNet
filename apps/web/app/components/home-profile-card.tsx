'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

type HomeProfile = {
  fullName: string;
  headline: string | null;
  location: string | null;
  about: string | null;
  onboardingStep: number;
  avatarKey: string | null;
};

export function HomeProfileCard({
  profile,
  contactCount,
  followingCount,
}: {
  profile: HomeProfile | null;
  contactCount: number;
  followingCount: number;
}) {
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [isEditing, setIsEditing] = useState(profile?.headline === null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const initials = (profile?.fullName ?? 'VouchNet member')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  async function saveHeadline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profile === null) return;
    setStatus('saving');
    try {
      const response = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          headline,
          location: profile.location ?? '',
          about: profile.about ?? '',
          onboardingStep: profile.onboardingStep,
        }),
      });
      if (!response.ok) throw new Error('PROFILE_UPDATE_FAILED');
      setIsEditing(false);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="member-card">
      <div className="member-card-cover" />
      <div className="member-avatar" aria-hidden="true">
        {initials}
      </div>
      <div className="member-card-body">
        <span className="member-status">Your profile</span>
        <h2>{profile?.fullName ?? 'VouchNet member'}</h2>
        {isEditing ? (
          <form className="inline-headline-form" onSubmit={(event) => void saveHeadline(event)}>
            <label className="sr-only" htmlFor="home-headline">
              Professional headline
            </label>
            <input
              autoFocus
              id="home-headline"
              maxLength={220}
              onChange={(event) => setHeadline(event.target.value)}
              placeholder="Add a professional headline"
              value={headline}
            />
            <button disabled={status === 'saving'} type="submit">
              {status === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </form>
        ) : (
          <p>{headline}</p>
        )}
        {status === 'error' ? <p className="form-error">Headline could not be saved.</p> : null}
        <div className="member-card-actions">
          {isEditing ? null : (
            <button className="text-action" onClick={() => setIsEditing(true)} type="button">
              Edit headline
            </button>
          )}
          <Link href="/onboarding">Edit profile</Link>
        </div>
      </div>
      <div className="member-card-stats">
        <Link href="/network">
          <span>Contacts</span>
          <strong>{contactCount}</strong>
        </Link>
        <Link href="/network">
          <span>Following</span>
          <strong>{followingCount}</strong>
        </Link>
      </div>
    </section>
  );
}
