'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { buttonClassName } from '../components/ui/button';
import {
  blankToNull,
  opportunityTypeLabels,
  opportunityTypes,
  type OpportunityType,
} from '../lib/opportunity-model';
import { readOpportunityError } from './opportunity-errors';

export type OpportunityFormValues = {
  type: OpportunityType;
  title: string;
  summary: string;
  description: string;
  lookingFor: string;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetCurrency: string;
  deadline: string | null;
  location: string | null;
  remote: boolean;
  proposalsOpen: boolean;
  projectId: string | null;
  tags: string[];
};

function numberOrNull(value: FormDataEntryValue | null): number | null {
  const blank = blankToNull(value);
  if (blank === null || typeof blank !== 'string') return null;
  const parsed = Number(blank);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const blank = blankToNull(value);
  return typeof blank === 'string' ? blank.trim() : null;
}

/** Create or edit an opportunity. Uses the employer posting form's layout and controls. */
export function OpportunityForm({
  projects,
  initial,
  opportunityId,
  cancelHref,
}: {
  projects: { id: string; name: string }[];
  initial?: OpportunityFormValues | undefined;
  opportunityId?: string | undefined;
  cancelHref: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const editing = opportunityId !== undefined;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      type: form.get('type'),
      title: String(form.get('title') ?? ''),
      summary: String(form.get('summary') ?? ''),
      description: String(form.get('description') ?? ''),
      lookingFor: String(form.get('lookingFor') ?? ''),
      budgetMin: numberOrNull(form.get('budgetMin')),
      budgetMax: numberOrNull(form.get('budgetMax')),
      budgetCurrency: textOrNull(form.get('budgetCurrency')) ?? 'USD',
      deadline: textOrNull(form.get('deadline')),
      location: textOrNull(form.get('location')),
      remote: form.get('remote') === 'on',
      proposalsOpen: form.get('proposalsOpen') === 'on',
      projectId: textOrNull(form.get('projectId')),
      tags: String(form.get('tags') ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== '')
        .slice(0, 10),
    };
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        editing ? `/api/opportunities/${opportunityId}` : '/api/opportunities',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(editing ? { edit: body } : body),
        },
      );
      if (!response.ok)
        throw new Error(
          await readOpportunityError(response, 'The opportunity could not be saved.'),
        );
      const result = (await response.json()) as { opportunity?: { slug: string }; slug?: string };
      const slug = result.opportunity?.slug ?? result.slug;
      router.push(slug === undefined ? '/opportunities/mine' : `/opportunities/${slug}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The opportunity could not be saved.');
      setSubmitting(false);
    }
  }

  return (
    <form className="employer-form opportunity-form" onSubmit={(event) => void submit(event)}>
      <div className="employer-form-section">
        <span>01</span>
        <div>
          <h2>What you need</h2>
          <div className="two">
            <label>
              Type
              <select name="type" defaultValue={initial?.type ?? 'REQUEST_FOR_SOFTWARE'}>
                {opportunityTypes.map((type) => (
                  <option key={type} value={type}>
                    {opportunityTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Related project <small>Optional, one you own or contribute to</small>
              <select name="projectId" defaultValue={initial?.projectId ?? ''}>
                <option value="">No linked project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Title
            <input
              name="title"
              required
              minLength={6}
              maxLength={120}
              defaultValue={initial?.title}
              placeholder="Offline inventory app for a food bank"
            />
          </label>
          <label>
            One-line summary <small>Shown in the directory, 20–280 characters</small>
            <textarea
              name="summary"
              required
              minLength={20}
              maxLength={280}
              rows={2}
              defaultValue={initial?.summary}
            />
          </label>
        </div>
      </div>
      <div className="employer-form-section">
        <span>02</span>
        <div>
          <h2>Scope and who fits</h2>
          <label>
            Details, constraints, and what done looks like
            <textarea
              name="description"
              required
              minLength={40}
              maxLength={8000}
              defaultValue={initial?.description}
            />
          </label>
          <label>
            Looking for
            <input
              name="lookingFor"
              required
              minLength={3}
              maxLength={400}
              defaultValue={initial?.lookingFor}
              placeholder="A builder with offline-first mobile experience"
            />
          </label>
          <label>
            Tags <small>Comma-separated, up to 10</small>
            <input
              name="tags"
              defaultValue={initial?.tags.join(', ')}
              placeholder="react native, sync, nonprofit"
            />
          </label>
        </div>
      </div>
      <div className="employer-form-section">
        <span>03</span>
        <div>
          <h2>Budget, timing, and place</h2>
          <div className="three">
            <label>
              Budget minimum <small>Optional</small>
              <input
                name="budgetMin"
                type="number"
                min={0}
                defaultValue={initial?.budgetMin ?? undefined}
              />
            </label>
            <label>
              Budget maximum
              <input
                name="budgetMax"
                type="number"
                min={0}
                defaultValue={initial?.budgetMax ?? undefined}
              />
            </label>
            <label>
              Currency
              <input
                name="budgetCurrency"
                maxLength={3}
                required
                defaultValue={initial?.budgetCurrency ?? 'USD'}
              />
            </label>
          </div>
          <div className="two">
            <label>
              Proposal deadline <small>Optional</small>
              <input name="deadline" type="date" defaultValue={initial?.deadline ?? undefined} />
            </label>
            <label>
              Location <small>Optional</small>
              <input
                name="location"
                maxLength={120}
                defaultValue={initial?.location ?? undefined}
                placeholder="Lisbon, Portugal"
              />
            </label>
          </div>
          <div className="opportunity-form-checks">
            <label className="project-check">
              <input name="remote" type="checkbox" defaultChecked={initial?.remote ?? true} />
              Remote is fine
            </label>
            <label className="project-check">
              <input
                name="proposalsOpen"
                type="checkbox"
                defaultChecked={initial?.proposalsOpen ?? true}
              />
              Accepting proposals
            </label>
          </div>
        </div>
      </div>
      <footer>
        <p>
          {error === null ? (
            'Members send proposals to you directly. You decide who to shortlist; nothing is ranked or written for you.'
          ) : (
            <span className="form-error" role="alert">
              {error}
            </span>
          )}
        </p>
        <div className="opportunity-form-actions">
          <Link className={buttonClassName({ variant: 'secondary', size: 'md' })} href={cancelHref}>
            Cancel
          </Link>
          <button className={buttonClassName({ size: 'md' })} disabled={submitting} type="submit">
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Publish opportunity'}
          </button>
        </div>
      </footer>
    </form>
  );
}
