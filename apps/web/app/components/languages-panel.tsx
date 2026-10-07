'use client';

import { useState } from 'react';
import { profileLanguages } from '../lib/profile-catalog';

export function LanguagesEditor({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  function toggle(language: string) {
    const next = selected.includes(language)
      ? selected.filter((value) => value !== language)
      : [...selected, language].slice(0, 12);
    setSelected(next);
    setStatus('idle');
    void persist(next);
  }

  async function persist(next: string[]) {
    setStatus('saving');
    try {
      const current = await fetch('/api/profile/me');
      if (!current.ok) throw new Error('PROFILE_FETCH_FAILED');
      const { profile } = (await current.json()) as {
        profile: {
          headline: string | null;
          location: string | null;
          about: string | null;
          onboardingStep: number;
        };
      };
      const response = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          headline: profile.headline ?? '',
          location: profile.location ?? '',
          about: profile.about ?? '',
          onboardingStep: profile.onboardingStep,
          languages: next,
        }),
      });
      if (!response.ok) throw new Error('PROFILE_UPDATE_FAILED');
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="languages-editor">
      <p className="languages-editor-hint">
        Pick up to 12 languages you build with. This updates automatically.
      </p>
      <div className="languages-grid" role="group" aria-label="Programming languages">
        {profileLanguages.map((language) => {
          const active = selected.includes(language);
          return (
            <button
              aria-pressed={active}
              className={active ? 'language-chip is-active' : 'language-chip'}
              disabled={status === 'saving' || (!active && selected.length >= 12)}
              key={language}
              type="button"
              onClick={() => toggle(language)}
            >
              {language}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="languages-editor-status">
        {status === 'saving'
          ? 'Saving…'
          : status === 'saved'
            ? 'Saved.'
            : status === 'error'
              ? 'Could not save languages. Try again.'
              : `${selected.length} selected`}
      </p>
    </div>
  );
}
