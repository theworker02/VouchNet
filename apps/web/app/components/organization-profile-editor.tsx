'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  organizationTechnologyCategories,
  type OrganizationTechnologyCategory,
} from '../lib/organization-profile-schema';

type TechnologyDraft = {
  name: string;
  category: OrganizationTechnologyCategory;
  sourceUrl: string;
};

export type OrganizationProfileEditorInitial = {
  name: string;
  tagline: string | null;
  description: string;
  headquarters: string | null;
  websiteUrl: string;
  careersUrl: string | null;
  engineeringUrl: string | null;
  repositoryUrl: string | null;
  technologies: TechnologyDraft[];
};

function text(value: string | null) {
  return value ?? '';
}

export function OrganizationProfileEditor({
  slug,
  initial,
}: {
  slug: string;
  initial: OrganizationProfileEditorInitial;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => ({
    ...initial,
    tagline: text(initial.tagline),
    headquarters: text(initial.headquarters),
    careersUrl: text(initial.careersUrl),
    engineeringUrl: text(initial.engineeringUrl),
    repositoryUrl: text(initial.repositoryUrl),
    technologies: initial.technologies.map((technology) => ({ ...technology })),
  }));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const technologyCountLabel = useMemo(
    () => `${draft.technologies.length}/30 technology signals`,
    [draft.technologies.length],
  );

  function reset() {
    setDraft({
      ...initial,
      tagline: text(initial.tagline),
      headquarters: text(initial.headquarters),
      careersUrl: text(initial.careersUrl),
      engineeringUrl: text(initial.engineeringUrl),
      repositoryUrl: text(initial.repositoryUrl),
      technologies: initial.technologies.map((technology) => ({ ...technology })),
    });
    setError(null);
    setEditing(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/organizations/${slug}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const code =
          typeof body === 'object' && body !== null && 'error' in body
            ? String(body.error)
            : 'UNKNOWN';
        setError(
          code === 'CONFLICT'
            ? 'Another organization already uses that name.'
            : code === 'WEBSITE_REVIEW_REQUIRED'
              ? 'A verified organization’s website needs a separate human review before it can change.'
              : 'Could not save the company profile. Check each required field and source link.',
        );
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!editing)
    return (
      <aside className="company-owner-panel" aria-label="Organization owner tools">
        <div>
          <p className="eyebrow">Organization owner</p>
          <strong>You manage this company page.</strong>
          <p>Update public details, official links, and cited technology signals.</p>
        </div>
        <button className="secondary" type="button" onClick={() => setEditing(true)}>
          Edit company page
        </button>
      </aside>
    );

  return (
    <section className="company-editor" aria-labelledby="company-editor-heading">
      <div className="company-editor-heading">
        <div>
          <p className="eyebrow">Organization owner</p>
          <h2 id="company-editor-heading">Edit company page</h2>
        </div>
        <span>{technologyCountLabel}</span>
      </div>
      <p className="company-editor-note">
        Your claim proves account control, not a domain badge. Cite a public source for every
        technology signal so visitors can assess it.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="company-editor-grid">
          <label>
            Organization name
            <input
              required
              maxLength={160}
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label>
            Headline
            <input
              maxLength={240}
              value={draft.tagline}
              onChange={(event) => setDraft({ ...draft, tagline: event.target.value })}
              placeholder="What your organization does"
            />
          </label>
          <label>
            Headquarters or remote policy
            <input
              maxLength={160}
              value={draft.headquarters}
              onChange={(event) => setDraft({ ...draft, headquarters: event.target.value })}
              placeholder="Remote-first · New York, NY"
            />
          </label>
          <label>
            Official website
            <input
              required
              inputMode="url"
              value={draft.websiteUrl}
              onChange={(event) => setDraft({ ...draft, websiteUrl: event.target.value })}
              placeholder="https://example.com"
            />
          </label>
          <label>
            Careers URL
            <input
              inputMode="url"
              value={draft.careersUrl}
              onChange={(event) => setDraft({ ...draft, careersUrl: event.target.value })}
              placeholder="https://example.com/careers"
            />
          </label>
          <label>
            Engineering URL
            <input
              inputMode="url"
              value={draft.engineeringUrl}
              onChange={(event) => setDraft({ ...draft, engineeringUrl: event.target.value })}
              placeholder="https://example.com/engineering"
            />
          </label>
          <label>
            Open-source URL
            <input
              inputMode="url"
              value={draft.repositoryUrl}
              onChange={(event) => setDraft({ ...draft, repositoryUrl: event.target.value })}
              placeholder="https://github.com/organization"
            />
          </label>
        </div>
        <label className="company-editor-description">
          About this organization
          <textarea
            required
            minLength={20}
            maxLength={6000}
            rows={6}
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </label>
        <div className="company-technology-editor">
          <div>
            <h3>Technology signals</h3>
            <p>These are public, citable signals—not a complete internal stack.</p>
          </div>
          {draft.technologies.map((technology, index) => (
            <div className="company-technology-row" key={`${technology.name}-${index}`}>
              <input
                required
                maxLength={80}
                aria-label={`Technology ${index + 1} name`}
                value={technology.name}
                onChange={(event) => {
                  const technologies = [...draft.technologies];
                  technologies[index] = { ...technology, name: event.target.value };
                  setDraft({ ...draft, technologies });
                }}
                placeholder="Technology"
              />
              <select
                aria-label={`Technology ${index + 1} category`}
                value={technology.category}
                onChange={(event) => {
                  const technologies = [...draft.technologies];
                  technologies[index] = {
                    ...technology,
                    category: event.target.value as OrganizationTechnologyCategory,
                  };
                  setDraft({ ...draft, technologies });
                }}
              >
                {organizationTechnologyCategories.map((category) => (
                  <option key={category} value={category}>
                    {category.toLowerCase()}
                  </option>
                ))}
              </select>
              <input
                required
                inputMode="url"
                aria-label={`Technology ${index + 1} source URL`}
                value={technology.sourceUrl}
                onChange={(event) => {
                  const technologies = [...draft.technologies];
                  technologies[index] = { ...technology, sourceUrl: event.target.value };
                  setDraft({ ...draft, technologies });
                }}
                placeholder="https://public-source.example"
              />
              <button
                className="quiet-link danger"
                type="button"
                disabled={busy}
                onClick={() =>
                  setDraft({
                    ...draft,
                    technologies: draft.technologies.filter(
                      (_, technologyIndex) => technologyIndex !== index,
                    ),
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="quiet-link"
            type="button"
            disabled={busy || draft.technologies.length >= 30}
            onClick={() =>
              setDraft({
                ...draft,
                technologies: [
                  ...draft.technologies,
                  { name: '', category: 'PRACTICE', sourceUrl: draft.websiteUrl },
                ],
              })
            }
          >
            + Add technology signal
          </button>
        </div>
        {error === null ? null : <p className="form-error">{error}</p>}
        <div className="company-editor-actions">
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save company page'}
          </button>
          <button className="secondary" type="button" disabled={busy} onClick={reset}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
