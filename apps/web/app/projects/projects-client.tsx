'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import type { FeaturedProofNode } from '../lib/featured-proof';
import type { ProjectRecord } from '../lib/projects';

export function ProjectsClient({
  initialProjects,
  initialFeaturedNodes,
  isPlus,
}: {
  initialProjects: ProjectRecord[];
  initialFeaturedNodes: FeaturedProofNode[];
  isPlus: boolean;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [featuredNodes, setFeaturedNodes] = useState(initialFeaturedNodes);
  const [pinningProjectId, setPinningProjectId] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          summary: form.get('summary'),
          description: form.get('description'),
          status: form.get('status'),
          projectUrl: optionalValue(form.get('projectUrl')),
          repositoryUrl: optionalValue(form.get('repositoryUrl')),
          documentationUrl: optionalValue(form.get('documentationUrl')),
          demoUrl: optionalValue(form.get('demoUrl')),
          tags: String(form.get('tags') ?? '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) {
        setStatus('Your project could not be published. Check the required fields and links.');
        return;
      }
      const body = (await response.json()) as { project: { slug: string } };
      setOpen(false);
      router.push(`/projects/${body.project.slug}`);
    } catch {
      setStatus(
        'Your project could not be published because the network is unavailable. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateFeatured(projectId: string, position: number | null) {
    setPinningProjectId(projectId);
    setStatus(null);
    try {
      const response = await fetch('/api/profile/featured-nodes', {
        method: position === null ? 'DELETE' : 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          position === null
            ? { position: featuredNodes.find((node) => node.projectId === projectId)?.position }
            : { projectId, position },
        ),
      });
      if (!response.ok) {
        setStatus(
          response.status === 403
            ? 'Featured proof is available with an active VouchNet+ membership.'
            : 'That featured proof update could not be saved.',
        );
        return;
      }
      const body = (await response.json()) as { nodes?: FeaturedProofNode[] };
      if (body.nodes !== undefined) setFeaturedNodes(body.nodes);
      else if (position === null)
        setFeaturedNodes((nodes) => nodes.filter((node) => node.projectId !== projectId));
    } catch {
      setStatus('That featured proof update could not be saved. Try again.');
    } finally {
      setPinningProjectId(null);
    }
  }

  return (
    <section className="projects-workspace">
      <header className="page-heading projects-heading">
        <div>
          <p className="eyebrow">Proof of work</p>
          <h1>Give your best work a durable home.</h1>
          <p>
            Projects are public, structured professional records. Add a clear explanation, useful
            links, and the technologies that make the work discoverable.
          </p>
          <p className="muted-copy">
            {isPlus
              ? `${featuredNodes.length}/3 proof-of-work nodes are pinned to your profile.`
              : 'VouchNet+ members can pin up to three proof-of-work nodes to their profile.'}
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)}>
          Add a project
        </button>
      </header>
      {projects.length === 0 ? (
        <section className="projects-empty">
          <div className="projects-empty-mark" aria-hidden="true">
            ↗
          </div>
          <div>
            <h2>Start with one project you can stand behind.</h2>
            <p>
              A shipped feature, open-source contribution, research note, or small experiment all
              make stronger professional evidence than a generic list of tools.
            </p>
          </div>
          <button type="button" onClick={() => setOpen(true)}>
            Create your first project
          </button>
        </section>
      ) : (
        <div className="project-grid">
          {projects.map((project) => {
            const pinned = featuredNodes.find((node) => node.projectId === project.id);
            const nextPosition = [0, 1, 2].find(
              (position) => !featuredNodes.some((node) => node.position === position),
            );
            return (
              <article key={project.id} className="project-card">
                <div className="project-card-topline">
                  <span>{project.status.toLowerCase()}</span>
                  <span>{project.ongoing ? 'Ongoing' : 'Documented work'}</span>
                </div>
                <h2>{project.name}</h2>
                <p>{project.summary}</p>
                <div className="project-tags">
                  {project.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="project-card-actions">
                  <Link href={`/projects/${project.slug}`}>Open project →</Link>
                  {pinned === undefined ? (
                    <button
                      className="text-action"
                      disabled={!isPlus || nextPosition === undefined || pinningProjectId !== null}
                      onClick={() => {
                        if (nextPosition !== undefined)
                          void updateFeatured(project.id, nextPosition);
                      }}
                      type="button"
                    >
                      {isPlus
                        ? nextPosition === undefined
                          ? 'Three pins used'
                          : 'Pin to profile'
                        : 'Pin with VouchNet+'}
                    </button>
                  ) : (
                    <button
                      className="text-action"
                      disabled={pinningProjectId !== null}
                      onClick={() => void updateFeatured(project.id, null)}
                      type="button"
                    >
                      Remove pin {pinned.position + 1}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {open ? (
        <div
          className="project-dialog-backdrop"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <dialog
            className="project-dialog"
            open
            aria-labelledby="project-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="eyebrow">New project</p>
                <h2 id="project-dialog-title">Publish a project record</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close project form"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>
            <form onSubmit={(event) => void create(event)}>
              <label>
                Project name
                <input name="name" required maxLength={100} />
              </label>
              <label>
                One-line summary
                <input name="summary" required minLength={10} maxLength={280} />
              </label>
              <label>
                What did you build?
                <textarea name="description" required minLength={10} maxLength={12_000} />
              </label>
              <div className="two">
                <label>
                  Status
                  <select name="status" defaultValue="SHIPPED">
                    <option value="IDEA">Idea</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </label>
                <label>
                  Tags <small>Comma-separated</small>
                  <input name="tags" placeholder="TypeScript, APIs, accessibility" />
                </label>
              </div>
              <details className="project-links">
                <summary>Add supporting links</summary>
                <div>
                  <label>
                    Live site
                    <input name="projectUrl" type="url" placeholder="https://" />
                  </label>
                  <label>
                    Repository
                    <input name="repositoryUrl" type="url" placeholder="https://" />
                  </label>
                  <label>
                    Documentation
                    <input name="documentationUrl" type="url" placeholder="https://" />
                  </label>
                  <label>
                    Demo
                    <input name="demoUrl" type="url" placeholder="https://" />
                  </label>
                </div>
              </details>
              {status === null ? null : (
                <p className="form-error" role="alert">
                  {status}
                </p>
              )}
              <footer>
                <button type="button" className="secondary-button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button disabled={submitting}>
                  {submitting ? 'Publishing…' : 'Publish project'}
                </button>
              </footer>
            </form>
          </dialog>
        </div>
      ) : null}
    </section>
  );
}

function optionalValue(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text === '' ? undefined : text;
}
