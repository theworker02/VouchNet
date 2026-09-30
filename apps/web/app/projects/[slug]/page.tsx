import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicProject } from '../../lib/projects';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const project = await getPublicProject((await params).slug);
  if (project === null) return { title: 'Project not found · VouchNet' };
  const description = project.summary ?? `A project by ${project.ownerName} on VouchNet.`;
  return {
    title: `${project.name} · VouchNet`,
    description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: { type: 'article', title: `${project.name} · VouchNet`, description },
  };
}

export default async function PublicProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = await getPublicProject((await params).slug);
  if (project === null) notFound();
  return (
    <main className="public-project">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          <Link className="quiet-link" href={`/vouch/${project.ownerSlug}`}>
            View profile
          </Link>
          <Link className="primary" href="/signup">
            Build your profile
          </Link>
        </div>
      </header>
      <article className="public-project-surface">
        <div className="public-project-topline">
          <span>{project.status.toLowerCase()}</span>
          <span>
            Published by <Link href={`/vouch/${project.ownerSlug}`}>{project.ownerName}</Link>
          </span>
        </div>
        <h1>{project.name}</h1>
        <p className="public-project-summary">{project.summary}</p>
        <div className="project-tags">
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="public-project-links">
          {project.projectUrl === null ? null : (
            <a href={project.projectUrl} rel="noreferrer" target="_blank">
              Live site ↗
            </a>
          )}
          {project.repositoryUrl === null ? null : (
            <a href={project.repositoryUrl} rel="noreferrer" target="_blank">
              Source code ↗
            </a>
          )}
          {project.documentationUrl === null ? null : (
            <a href={project.documentationUrl} rel="noreferrer" target="_blank">
              Documentation ↗
            </a>
          )}
          {project.demoUrl === null ? null : (
            <a href={project.demoUrl} rel="noreferrer" target="_blank">
              Demo ↗
            </a>
          )}
        </div>
        <section className="public-project-description">
          <h2>Project context</h2>
          <p>{project.description}</p>
        </section>
      </article>
    </main>
  );
}
