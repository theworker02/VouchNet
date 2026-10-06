'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { FeaturedProofNode } from '../lib/featured-proof';
import { projectStatusLabels } from '../lib/project-model';
import type { ProjectRecord } from '../lib/projects';
import { ProjectFormDialog } from './project-form';

export function ProjectsClient({
  initialProjects,
  initialFeaturedNodes,
  isPlus,
}: {
  initialProjects: ProjectRecord[];
  initialFeaturedNodes: FeaturedProofNode[];
  isPlus: boolean;
}) {
  const projects = initialProjects;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [featuredNodes, setFeaturedNodes] = useState(initialFeaturedNodes);
  const [pinningProjectId, setPinningProjectId] = useState<string | null>(null);
  const closeDialog = useCallback(() => setOpen(false), []);

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
            Projects are public, structured professional records. Build in public with a dev log,
            invite the people you build with, and say what help you are looking for.
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
                  <span>{projectStatusLabels[project.status]}</span>
                  <span>
                    {project.openSource ? 'Open source · ' : ''}
                    {project.followerCount === 1
                      ? '1 follower'
                      : `${project.followerCount} followers`}
                  </span>
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
      {open ? <ProjectFormDialog onClose={closeDialog} /> : null}
      {status === null ? null : (
        <p className="form-error" role="alert">
          {status}
        </p>
      )}
    </section>
  );
}
