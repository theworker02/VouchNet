'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  lookingForLabels,
  lookingForOptions,
  projectStatusLabels,
  projectStatuses,
  type LookingFor,
  type ProjectStatus,
} from '../lib/project-model';

export type ProjectFormValues = {
  id?: string;
  name: string;
  summary: string;
  description: string;
  status: ProjectStatus;
  tags: string[];
  openSource: boolean;
  lookingFor: LookingFor[];
  projectUrl: string | null;
  repositoryUrl: string | null;
  documentationUrl: string | null;
  demoUrl: string | null;
};

const emptyProject: ProjectFormValues = {
  name: '',
  summary: '',
  description: '',
  status: 'ACTIVE_DEVELOPMENT',
  tags: [],
  openSource: false,
  lookingFor: [],
  projectUrl: null,
  repositoryUrl: null,
  documentationUrl: null,
  demoUrl: null,
};

/** One dialog for publishing and editing project records, built on the existing project dialog. */
export function ProjectFormDialog({
  initial,
  onClose,
}: {
  initial?: ProjectFormValues;
  onClose: () => void;
}) {
  const router = useRouter();
  const values = initial ?? emptyProject;
  const editing = values.id !== undefined;
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    const links = (name: string) => {
      const text = String(form.get(name) ?? '').trim();
      return editing ? text : text === '' ? undefined : text;
    };
    try {
      const response = await fetch(editing ? `/api/projects/${values.id}` : '/api/projects', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          summary: form.get('summary'),
          description: form.get('description'),
          status: form.get('status'),
          openSource: form.get('openSource') === 'on',
          lookingFor: form.getAll('lookingFor'),
          projectUrl: links('projectUrl'),
          repositoryUrl: links('repositoryUrl'),
          documentationUrl: links('documentationUrl'),
          demoUrl: links('demoUrl'),
          tags: String(form.get('tags') ?? '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) {
        setStatus(
          editing
            ? 'Your changes could not be saved. Check the required fields and links.'
            : 'Your project could not be published. Check the required fields and links.',
        );
        return;
      }
      const body = (await response.json()) as { project: { slug: string } };
      onClose();
      if (editing) router.refresh();
      else router.push(`/projects/${body.project.slug}`);
    } catch {
      setStatus('The project could not be saved because the network is unavailable. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="project-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <dialog
        className="project-dialog"
        open
        aria-modal="true"
        aria-labelledby="project-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">{editing ? 'Edit project' : 'New project'}</p>
            <h2 id="project-dialog-title">
              {editing ? 'Update this project record' : 'Publish a project record'}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close project form"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <label>
            Project name
            <input
              ref={firstField}
              name="name"
              required
              maxLength={100}
              defaultValue={values.name}
            />
          </label>
          <label>
            One-line summary
            <input
              name="summary"
              required
              minLength={10}
              maxLength={280}
              defaultValue={values.summary}
            />
          </label>
          <label>
            What are you building?
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={12_000}
              defaultValue={values.description}
            />
          </label>
          <div className="two">
            <label>
              Status
              <select name="status" defaultValue={values.status}>
                {projectStatuses.map((value) => (
                  <option key={value} value={value}>
                    {projectStatusLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tags <small>Comma-separated</small>
              <input
                name="tags"
                placeholder="TypeScript, APIs, accessibility"
                defaultValue={values.tags.join(', ')}
              />
            </label>
          </div>
          <label className="project-check">
            <input name="openSource" type="checkbox" defaultChecked={values.openSource} />
            This project is open source
          </label>
          <fieldset className="project-choice-set">
            <legend>Looking for</legend>
            <div>
              {lookingForOptions.map((option) => (
                <label key={option} className="project-check">
                  <input
                    name="lookingFor"
                    type="checkbox"
                    value={option}
                    defaultChecked={values.lookingFor.includes(option)}
                  />
                  {lookingForLabels[option]}
                </label>
              ))}
            </div>
          </fieldset>
          <details className="project-links" open={editing}>
            <summary>{editing ? 'Supporting links' : 'Add supporting links'}</summary>
            <div>
              <label>
                Live site
                <input
                  name="projectUrl"
                  type="url"
                  placeholder="https://"
                  defaultValue={values.projectUrl ?? ''}
                />
              </label>
              <label>
                Repository
                <input
                  name="repositoryUrl"
                  type="url"
                  placeholder="https://"
                  defaultValue={values.repositoryUrl ?? ''}
                />
              </label>
              <label>
                Documentation
                <input
                  name="documentationUrl"
                  type="url"
                  placeholder="https://"
                  defaultValue={values.documentationUrl ?? ''}
                />
              </label>
              <label>
                Demo
                <input
                  name="demoUrl"
                  type="url"
                  placeholder="https://"
                  defaultValue={values.demoUrl ?? ''}
                />
              </label>
            </div>
          </details>
          {status === null ? null : (
            <p className="form-error" role="alert">
              {status}
            </p>
          )}
          <footer>
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button disabled={submitting}>
              {submitting
                ? editing
                  ? 'Saving…'
                  : 'Publishing…'
                : editing
                  ? 'Save changes'
                  : 'Publish project'}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
