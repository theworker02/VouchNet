import Link from 'next/link';
import type { Metadata } from 'next';
import { Shell } from '../components/shell';
import { getDiscoverData, getProfileIntent, type DiscoverProject } from '../lib/build-discovery';
import { getCurrentActor } from '../lib/identity';
import { lookingForLabels, projectStatusLabels, type LookingFor } from '../lib/project-model';
import {
  normalizeProfileIntent,
  profileIntentLabels,
  profileIntents,
  type ProfileIntent,
} from '../lib/profile-intent';
import { OpportunityRow } from '../opportunities/opportunity-row';
import { IntentSelect } from './intent-select';

export const metadata: Metadata = {
  title: 'Discover · VouchNet',
  description:
    'People building in public, projects gaining momentum, and open opportunities, ranked from recorded activity.',
  alternates: { canonical: '/discover' },
};

type SearchParams = Promise<{ intent?: string; skill?: string }>;

const sectionLinks = [
  ['people', 'People'],
  ['momentum', 'Momentum'],
  ['opportunities', 'Opportunities'],
  ['new', 'New'],
  ['launched', 'Launched'],
  ['open-source', 'Open source'],
  ['research', 'Research'],
  ['vouched', 'Vouched builders'],
] as const;

function discoverHref(
  params: { intent: ProfileIntent | null; skill: string | null },
  hash: string,
) {
  const query = new URLSearchParams();
  if (params.intent !== null) query.set('intent', params.intent);
  if (params.skill !== null) query.set('skill', params.skill);
  const search = query.toString();
  return `/discover${search === '' ? '' : `?${search}`}#${hash}`;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default async function DiscoverPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await getCurrentActor();
  const viewerId = actor?.userId ?? null;
  const params = await searchParams;
  const intent = normalizeProfileIntent(params.intent);
  const skill = params.skill?.trim().slice(0, 40) || null;
  const [data, ownIntent] = await Promise.all([
    getDiscoverData({ viewerId, intent, skill }),
    viewerId === null ? Promise.resolve(null) : getProfileIntent(viewerId),
  ]);
  const { builders, projects, opportunities, vouched, skills } = data;
  const signInHref = '/login?next=/discover';

  const content = (
    <section className="discover-page">
      <header className="page-heading projects-heading">
        <div>
          <p className="eyebrow">Discover</p>
          <h1>See who is building, and what.</h1>
          <p>
            Every list here comes from recorded activity: build logs, follows, contributors,
            proposals, and vouches. Each card says why it is here.
          </p>
        </div>
        {actor === null ? null : <IntentSelect initialIntent={ownIntent} />}
      </header>

      <nav className="discover-jump project-tags" aria-label="Discover sections">
        {sectionLinks.map(([hash, label]) => (
          <a key={hash} href={`#${hash}`}>
            {label}
          </a>
        ))}
      </nav>

      <section id="people" className="company-jobs discover-section" aria-labelledby="people-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">People</p>
            <h2 id="people-title">Building interesting things</h2>
          </div>
        </div>
        <div className="discover-filter project-tags" aria-label="Filter people by intent">
          <Link
            href={discoverHref({ intent: null, skill }, 'people')}
            aria-current={intent === null ? 'true' : undefined}
          >
            Everyone
          </Link>
          {profileIntents.map((value) => (
            <Link
              key={value}
              href={discoverHref({ intent: value, skill }, 'people')}
              aria-current={intent === value ? 'true' : undefined}
            >
              {profileIntentLabels[value]}
            </Link>
          ))}
        </div>
        {builders.length === 0 ? (
          <Empty
            title={
              intent === null
                ? 'Nobody is building in public yet.'
                : `Nobody marked “${profileIntentLabels[intent]}” is building right now.`
            }
            detail={
              intent === null
                ? 'Start a project and post to its build log; active builders appear here.'
                : 'Try another intent, or see everyone.'
            }
          />
        ) : (
          <div className="discover-people">
            {builders.map((builder) => (
              <article key={builder.id} className="discover-person">
                <div className="discover-person-head">
                  <span className="discover-avatar" aria-hidden="true">
                    {initials(builder.name)}
                  </span>
                  <div>
                    <h3>
                      <Link href={`/in/${builder.slug}`}>{builder.name}</Link>
                    </h3>
                    <p>{builder.headline ?? 'VouchNet member'}</p>
                  </div>
                </div>
                <p className="discover-person-meta">
                  {builder.intent === null ? null : (
                    <span className="discover-intent-chip">
                      {profileIntentLabels[builder.intent]}
                    </span>
                  )}
                  <span>{builder.reputationLevel}</span>
                </p>
                <ul className="discover-reasons" aria-label="Why this person is here">
                  {builder.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        id="momentum"
        className="company-jobs discover-section"
        aria-labelledby="momentum-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Momentum</p>
            <h2 id="momentum-title">Projects picking up speed</h2>
          </div>
          {actor === null ? null : <Link href="/projects">Your projects</Link>}
        </div>
        {projects.momentum.length === 0 ? (
          <Empty
            title="No project has recent activity yet."
            detail="Build-log entries, new followers, and new contributors from the last 14 days put a project here."
          />
        ) : (
          <div className="project-grid discover-project-grid">
            {projects.momentum.map((project) => (
              <article key={project.id} className="project-card">
                <div className="project-card-topline">
                  <span>{projectStatusLabels[project.status]}</span>
                  <span>{project.ownerName}</span>
                </div>
                <h3>{project.name}</h3>
                <p>{project.summary ?? 'No summary yet.'}</p>
                <ul className="discover-reasons" aria-label="Why this project is here">
                  {project.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <Link href={`/projects/${project.slug}`}>
                  Open project<span className="sr-only">: {project.name}</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        id="opportunities"
        className="company-jobs discover-section"
        aria-labelledby="opportunities-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Opportunities</p>
            <h2 id="opportunities-title">Open requests from builders</h2>
          </div>
          <Link href="/opportunities">All opportunities</Link>
        </div>
        {opportunities.length === 0 ? (
          <Empty
            title="No open opportunities right now."
            detail="Requests for software, contracts, grants, bounties, and research collaborations appear here."
          />
        ) : (
          <div className="job-list">
            {opportunities.map((opportunity) => (
              <OpportunityRow key={opportunity.id} opportunity={opportunity} headingLevel="h3" />
            ))}
          </div>
        )}
      </section>

      <div className="discover-columns">
        <ProjectColumn
          id="new"
          eyebrow="New"
          title="Started this month"
          projects={projects.fresh}
          detail={(project) => `Started by ${project.ownerName}`}
          empty="No new projects in the last 30 days."
        />
        <ProjectColumn
          id="launched"
          eyebrow="Launched"
          title="Recently shipped"
          projects={projects.launched}
          detail={(project) => project.ownerName}
          empty="No launched projects yet."
        />
        <ProjectColumn
          id="open-source"
          eyebrow="Open source"
          title="Open to contributors"
          projects={projects.openSource}
          detail={(project) =>
            project.lookingFor.length === 0
              ? project.ownerName
              : `Looking for ${project.lookingFor
                  .slice(0, 2)
                  .map((role) => lookingForLabels[role as LookingFor] ?? role)
                  .join(', ')
                  .toLowerCase()}`
          }
          empty="No open-source projects yet."
        />
        <ProjectColumn
          id="research"
          eyebrow="Research"
          title="Research and experiments"
          projects={projects.research}
          detail={(project) => project.ownerName}
          empty="No research projects yet. Projects looking for researchers or tagged research appear here."
          footer={<Link href="/opportunities?type=RESEARCH">Research collaborations</Link>}
        />
      </div>

      <section
        id="vouched"
        className="company-jobs discover-section"
        aria-labelledby="vouched-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Vouched builders</p>
            <h2 id="vouched-title">
              {skill === null ? 'Vouched for by people they built with' : `Vouched for in ${skill}`}
            </h2>
          </div>
        </div>
        {skills.length === 0 ? null : (
          <div
            className="discover-filter project-tags"
            aria-label="Filter vouched builders by skill"
          >
            <Link
              href={discoverHref({ intent, skill: null }, 'vouched')}
              aria-current={skill === null ? 'true' : undefined}
            >
              Any skill
            </Link>
            {skills.map((entry) => (
              <Link
                key={entry.skill}
                href={discoverHref({ intent, skill: entry.skill }, 'vouched')}
                aria-current={
                  skill?.toLowerCase() === entry.skill.toLowerCase() ? 'true' : undefined
                }
              >
                {entry.skill}
              </Link>
            ))}
          </div>
        )}
        {vouched.length === 0 ? (
          <Empty
            title={
              skill === null ? 'No public vouches yet.' : `No public vouches for ${skill} yet.`
            }
            detail="Vouches come from people who worked with someone, with the context they shared."
          />
        ) : (
          <div className="job-list">
            {vouched.map((person) => (
              <article key={person.userId} className="job-row discover-vouched-row">
                <div>
                  <div className="job-row-topline">
                    <span>
                      {person.vouchers} {person.vouchers === 1 ? 'person vouches' : 'people vouch'}
                    </span>
                    <span>{person.skills.slice(0, 3).join(' · ')}</span>
                  </div>
                  <h3>{person.name}</h3>
                  <p>
                    {person.headline ?? 'VouchNet member'}
                    {person.voucherNames.length === 0
                      ? ''
                      : ` · vouched for by ${person.voucherNames.join(', ')}`}
                  </p>
                </div>
                <Link href={`/in/${person.slug}`}>
                  View profile<span className="sr-only">: {person.name}</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <details className="company-jobs discover-explainer">
        <summary>How discovery ranks things</summary>
        <ul>
          <li>
            <strong>People</strong> are ordered by recent building: build-log entries in the last 30
            days count most, then projects they maintain and projects they contribute to.
            Participation reputation and the number of distinct people vouching only break ties, and
            both are capped.
          </li>
          <li>
            <strong>Momentum</strong> adds up build-log entries, new followers, new contributors,
            and new opportunities from the last 14 days. Each signal loses half its weight every 7
            days, so a quiet week lets other projects through.
          </li>
          <li>
            <strong>Opportunities</strong> favor ones closing within 14 days, then the newest, with
            a small lift for requests that have few proposals.
          </li>
          <li>
            Nothing is promoted for payment, and nothing is predicted from what you click. Private
            projects, hidden profiles, and anyone you have blocked never appear.
          </li>
        </ul>
      </details>
    </section>
  );

  if (actor !== null) return <Shell>{content}</Shell>;
  return (
    <main className="directory-page discover-public">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          <Link className="quiet-link" href={signInHref}>
            Sign in
          </Link>
          <Link className="primary" href="/signup">
            Build your profile
          </Link>
        </div>
      </header>
      {content}
    </main>
  );
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="discover-empty">
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}

function ProjectColumn({
  id,
  eyebrow,
  title,
  projects,
  detail,
  empty,
  footer,
}: {
  id: string;
  eyebrow: string;
  title: string;
  projects: DiscoverProject[];
  detail: (project: DiscoverProject) => string;
  empty: string;
  footer?: React.ReactNode;
}) {
  return (
    <section id={id} className="company-jobs discover-section" aria-labelledby={`${id}-title`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={`${id}-title`}>{title}</h2>
        </div>
        {footer}
      </div>
      {projects.length === 0 ? (
        <p className="discover-column-empty">{empty}</p>
      ) : (
        <div className="job-list">
          {projects.map((project) => (
            <article key={project.id} className="job-row">
              <div>
                <div className="job-row-topline">
                  <span>{projectStatusLabels[project.status]}</span>
                  <span>{detail(project)}</span>
                </div>
                <h3>
                  <Link href={`/projects/${project.slug}`}>{project.name}</Link>
                </h3>
                <p>{project.summary ?? 'No summary yet.'}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
