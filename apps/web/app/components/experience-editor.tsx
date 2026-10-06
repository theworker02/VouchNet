'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  employmentTypeLabels,
  employmentTypes,
  locationTypeLabels,
  locationTypes,
  monthLabels,
  type EmploymentType,
  type LocationType,
} from '../lib/profile-catalog';

export interface ExperienceDraft {
  id?: string;
  title: string;
  organization: string;
  employmentType: EmploymentType;
  location: string;
  locationType: LocationType | null;
  startMonth: number | null;
  startYear: number;
  endMonth: number | null;
  endYear: number | null;
  isCurrent: boolean;
  description: string;
}

export interface ExperienceView extends Omit<ExperienceDraft, 'id' | 'location' | 'description'> {
  id: string;
  location: string | null;
  description: string | null;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 75 }, (_, index) => currentYear - index);

const emptyDraft: ExperienceDraft = {
  title: '',
  organization: '',
  employmentType: 'FULL_TIME',
  location: '',
  locationType: null,
  startMonth: null,
  startYear: currentYear,
  endMonth: null,
  endYear: null,
  isCurrent: false,
  description: '',
};

function toPayload(draft: ExperienceDraft) {
  return {
    title: draft.title.trim(),
    organization: draft.organization.trim(),
    employmentType: draft.employmentType,
    location: draft.location.trim(),
    locationType: draft.locationType,
    startMonth: draft.startMonth,
    startYear: draft.startYear,
    endMonth: draft.isCurrent ? null : draft.endMonth,
    endYear: draft.isCurrent ? null : draft.endYear,
    isCurrent: draft.isCurrent,
    description: draft.description.trim(),
  };
}

function rangeLabel(entry: ExperienceView): string {
  const start = `${entry.startMonth === null ? '' : `${monthLabels[entry.startMonth - 1]} `}${entry.startYear}`;
  if (entry.isCurrent) return `${start} — Present`;
  const end = `${entry.endMonth === null ? '' : `${monthLabels[entry.endMonth - 1]} `}${entry.endYear ?? ''}`;
  return `${start} — ${end}`;
}

export function ExperienceEditor({ initial }: { initial: ExperienceView[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ExperienceDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (draft === null) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        draft.id === undefined ? '/api/profile/experience' : `/api/profile/experience/${draft.id}`,
        {
          method: draft.id === undefined ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(toPayload(draft)),
        },
      );
      if (!response.ok) {
        setError('Could not save this experience. Check the fields and try again.');
        return;
      }
      setDraft(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/profile/experience/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="experience-editor">
      {initial.map((entry) => (
        <article className="experience-entry" key={entry.id}>
          <div>
            <strong>{entry.title}</strong>
            <p>
              {entry.organization} · {employmentTypeLabels[entry.employmentType]}
            </p>
            <span>
              {rangeLabel(entry)}
              {entry.location === null || entry.location === '' ? '' : ` · ${entry.location}`}
              {entry.locationType === null ? '' : ` (${locationTypeLabels[entry.locationType]})`}
            </span>
            {entry.description === null || entry.description === '' ? null : (
              <p>{entry.description}</p>
            )}
          </div>
          <div className="experience-entry-actions">
            <button
              className="quiet-link"
              type="button"
              disabled={busy}
              onClick={() =>
                setDraft({
                  ...entry,
                  location: entry.location ?? '',
                  description: entry.description ?? '',
                })
              }
            >
              Edit
            </button>
            <button
              className="quiet-link danger"
              type="button"
              disabled={busy}
              onClick={() => void remove(entry.id)}
            >
              Remove
            </button>
          </div>
        </article>
      ))}
      {draft === null ? (
        <button className="secondary" type="button" onClick={() => setDraft({ ...emptyDraft })}>
          Add experience
        </button>
      ) : (
        <form
          className="experience-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="experience-form-row">
            <label>
              Title
              <input
                required
                maxLength={160}
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="Software Engineer"
              />
            </label>
            <label>
              Company or organization
              <input
                required
                maxLength={160}
                value={draft.organization}
                onChange={(event) => setDraft({ ...draft, organization: event.target.value })}
                placeholder="VouchNet"
              />
            </label>
          </div>
          <div className="experience-form-row">
            <label>
              Employment type
              <select
                value={draft.employmentType}
                onChange={(event) =>
                  setDraft({ ...draft, employmentType: event.target.value as EmploymentType })
                }
              >
                {employmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {employmentTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Location type
              <select
                value={draft.locationType ?? ''}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    locationType:
                      event.target.value === '' ? null : (event.target.value as LocationType),
                  })
                }
              >
                <option value="">Not specified</option>
                {locationTypes.map((type) => (
                  <option key={type} value={type}>
                    {locationTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Location
              <input
                maxLength={160}
                value={draft.location}
                onChange={(event) => setDraft({ ...draft, location: event.target.value })}
                placeholder="City, country"
              />
            </label>
          </div>
          <div className="experience-form-row">
            <label>
              Start month
              <select
                value={draft.startMonth ?? ''}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    startMonth: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
              >
                <option value="">Month</option>
                {monthLabels.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start year
              <select
                value={draft.startYear}
                onChange={(event) => setDraft({ ...draft, startYear: Number(event.target.value) })}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            {draft.isCurrent ? null : (
              <>
                <label>
                  End month
                  <select
                    value={draft.endMonth ?? ''}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        endMonth: event.target.value === '' ? null : Number(event.target.value),
                      })
                    }
                  >
                    <option value="">Month</option>
                    {monthLabels.map((month, index) => (
                      <option key={month} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  End year
                  <select
                    value={draft.endYear ?? ''}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        endYear: event.target.value === '' ? null : Number(event.target.value),
                      })
                    }
                  >
                    <option value="">Year</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
          <label className="experience-current">
            <input
              type="checkbox"
              checked={draft.isCurrent}
              onChange={(event) => setDraft({ ...draft, isCurrent: event.target.checked })}
            />
            I currently work here
          </label>
          <label>
            Description
            <textarea
              maxLength={4000}
              rows={3}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="What you did, shipped, and were responsible for"
            />
          </label>
          {error === null ? null : <p className="form-error">{error}</p>}
          <div className="experience-form-actions">
            <button className="primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : draft.id === undefined ? 'Add experience' : 'Save changes'}
            </button>
            <button
              className="secondary"
              type="button"
              disabled={busy}
              onClick={() => setDraft(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
