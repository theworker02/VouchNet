import Link from 'next/link';
import type { Metadata } from 'next';
import { PublicFooter } from '../components/public-footer';

export const metadata: Metadata = {
  title: 'About VouchNet | How the network is organized',
  description:
    'VouchNet explained in one page: who members are, what a vouch is, how companies, jobs, and services fit together, and the rule that humans participate while AI is an authorized tool.',
  alternates: { canonical: '/about' },
};

const siteUrl = process.env.APP_URL?.trim() || 'https://vouchnet.dev';

const sections = [
  {
    title: 'People',
    body: 'Every member has a profile — work experience, services and hourly rate, projects, and badges. Profiles are public pages anyone can read.',
    links: [
      { href: '/discover', label: 'Browse members' },
      { href: '/signup', label: 'Create your profile' },
    ],
  },
  {
    title: 'Vouches',
    body: "A vouch is a signed endorsement from one member to another about real work. Vouches form each member's trust graph — you can see exactly who vouched for whom and why.",
    links: [{ href: '/explore', label: 'See the network' }],
  },
  {
    title: 'Companies',
    body: 'Organizations get public pages with roles, projects, and a verified-organization badge. Every company can be claimed by its real team through a verified-email invite.',
    links: [{ href: '/jobs', label: 'Open roles' }],
  },
  {
    title: 'Posts and comments',
    body: 'Members publish work updates as plain text or Markdown, mention people and companies with @, and discuss in threaded comments with reactions. Public posts are readable without an account.',
    links: [{ href: '/feed', label: 'Your feed' }],
  },
  {
    title: 'Services and hire requests',
    body: "Members list what they do and what they charge. Anyone can send a formal request describing the work — it lands in the provider's inbox to accept or decline.",
    links: [],
  },
  {
    title: 'The one rule',
    body: 'Humans participate. AI is an explicitly authorized tool: integrations and agents act through scoped credentials and approvals — never as fake members.',
    links: [{ href: '/developers', label: 'Developer docs' }],
  },
];

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About VouchNet',
    url: `${siteUrl}/about`,
    isPartOf: { '@type': 'WebSite', name: 'VouchNet', url: siteUrl },
  };
  return (
    <main className="policy-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          <Link className="quiet-link" href="/explore">
            Explore
          </Link>
          <Link className="primary" href="/signup">
            Create account
          </Link>
        </div>
      </header>
      <article className="policy-content">
        <p className="eyebrow">VouchNet</p>
        <h1>A professional network you can read at a glance</h1>
        <p className="policy-lead">
          No mysterious feeds or engagement mechanics. VouchNet has six moving parts — here is what
          each one is and where to find it.
        </p>
        {sections.map((section, index) => (
          <section key={section.title}>
            <h2>
              {index + 1}. {section.title}
            </h2>
            <p>{section.body}</p>
            {section.links.length > 0 ? (
              <p>
                {section.links.map((link, linkIndex) => (
                  <span key={link.href}>
                    {linkIndex > 0 ? ' · ' : ''}
                    <Link href={link.href}>{link.label}</Link>
                  </span>
                ))}
              </p>
            ) : null}
          </section>
        ))}
        <section>
          <h2>Find anything</h2>
          <p>
            Every public page lives at a stable, readable address: <code>/vouch/name</code> for
            people, <code>/company/name</code> for organizations, <code>/projects/name</code> for
            projects, <code>/jobs/title</code> for roles, and <code>/post/id</code> for posts. The
            full index is at <a href="/sitemap.xml">/sitemap.xml</a>.
          </p>
        </section>
      </article>
      <PublicFooter />
    </main>
  );
}
