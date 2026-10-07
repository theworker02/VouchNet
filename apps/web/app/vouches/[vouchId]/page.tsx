import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Shell } from '../../components/shell';
import { VouchMark } from '../../components/vouches/vouch-mark';
import { getCurrentActor } from '../../lib/identity';
import { canReviewModeration } from '../../lib/moderation';
import { relationshipLabels, verificationLabels, visibilityLabels } from '../../lib/vouch-model';
import { getVouchDetail, type VouchDetail } from '../../lib/work-vouches';

export const metadata: Metadata = { title: 'Vouch · VouchNet', robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export default async function VouchPage({ params }: { params: Promise<{ vouchId: string }> }) {
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).vouchId);
  if (!parsed.success) notFound();
  const actor = await getCurrentActor();
  const isModerator = actor === null ? false : await canReviewModeration(actor.userId);
  const vouch = await getVouchDetail(parsed.data, actor?.userId ?? null, isModerator);
  if (vouch === null) notFound();
  if (actor === null)
    return (
      <main className="public-project">
        <header className="public-nav">
          <Link className="brand" href="/">
            VouchNet
          </Link>
          <div>
            <Link className="quiet-link" href="/login">
              Sign in
            </Link>
            <Link className="primary" href="/signup">
              Build your profile
            </Link>
          </div>
        </header>
        <VouchRecord vouch={vouch} />
      </main>
    );
  return (
    <Shell>
      <VouchRecord vouch={vouch} />
    </Shell>
  );
}

function VouchRecord({ vouch }: { vouch: VouchDetail }) {
  return (
    <article className="instrument vouch-record" aria-labelledby="vouch-record-title">
      <header className="vouch-console-header">
        <span className="instrument-label">VERIFIED VOUCH</span>
        <span className="instrument-label">
          {verificationLabels[vouch.verificationLevel].label.toUpperCase()}
        </span>
      </header>
      <div className="vouch-console-body">
        <div className="vouch-inspector-route">
          <span className="instrument-avatar" aria-hidden="true">
            {vouch.author.firstName[0]}
            {vouch.author.lastName[0]}
          </span>
          <VouchMark size={22} />
          <span className="instrument-avatar" aria-hidden="true">
            {vouch.recipient.firstName[0]}
            {vouch.recipient.lastName[0]}
          </span>
        </div>
        <h1 id="vouch-record-title">
          <Link href={`/vouch/${vouch.author.slug}`}>{vouch.author.name}</Link>
          <span className="instrument-muted"> vouched for </span>
          <Link href={`/vouch/${vouch.recipient.slug}`}>{vouch.recipient.name}</Link>
        </h1>
        <ul className="vouch-artifact-skills" aria-label="Skills">
          {vouch.skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
        <p className="instrument-label vouch-artifact-year">
          WORKED TOGETHER · {vouch.workedTogetherYear}
        </p>
        <blockquote>{vouch.statement}</blockquote>
        <dl className="vouch-inspector-facts">
          <div>
            <dt>Relationship</dt>
            <dd>{relationshipLabels[vouch.relationship]}</dd>
          </div>
          <div>
            <dt>Context</dt>
            <dd>
              {vouch.context === null ? (
                'None attached'
              ) : vouch.context.href === null ? (
                vouch.context.name
              ) : (
                <Link href={vouch.context.href}>{vouch.context.name}</Link>
              )}
            </dd>
          </div>
          <div>
            <dt>Verification</dt>
            <dd>
              {verificationLabels[vouch.verificationLevel].label}
              <small>{verificationLabels[vouch.verificationLevel].detail}</small>
            </dd>
          </div>
          <div>
            <dt>Vouched</dt>
            <dd>{dateFormat.format(new Date(vouch.createdAt))}</dd>
          </div>
          {vouch.editedAt === null ? null : (
            <div>
              <dt>Edited</dt>
              <dd>{dateFormat.format(new Date(vouch.editedAt))}</dd>
            </div>
          )}
          <div>
            <dt>Visibility</dt>
            <dd>{visibilityLabels[vouch.visibility]}</dd>
          </div>
        </dl>
        <section className="vouch-inspector-provenance" aria-label="Why this vouch is credible">
          <h2 className="instrument-label">WHY THIS VOUCH IS CREDIBLE</h2>
          <ul>
            {vouch.provenance.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </section>
        <footer className="vouch-inspector-actions">
          <Link className="instrument-quiet" href={`/vouch/${vouch.recipient.slug}`}>
            View {vouch.recipient.firstName}’s vouches
          </Link>
          {vouch.viewerActions.includes('REPORT') ? (
            <Link
              className="instrument-quiet"
              href={`/moderation/report?path=${encodeURIComponent(`/vouches/${vouch.id}`)}`}
            >
              Report
            </Link>
          ) : null}
        </footer>
      </div>
    </article>
  );
}
