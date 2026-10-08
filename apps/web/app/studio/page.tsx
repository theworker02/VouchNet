import Link from 'next/link';
import { VouchNetLogo } from '../components/brand';
import { studioPackages } from '../lib/studio-config';

export const metadata = {
  title: 'VouchNet Studio | Websites and product systems',
  description:
    'A thoughtful website redesign and development service for organizations that need a production-ready digital presence.',
};

export default function StudioPage() {
  return (
    <main className="studio-page">
      <nav className="studio-nav">
        <Link href="/">
          <VouchNetLogo />
        </Link>
        <div>
          <Link href="/studio/projects">Project dashboard</Link>
          <Link className="primary-button" href="/studio/request">
            Start a project
          </Link>
        </div>
      </nav>
      <section className="studio-hero">
        <p className="eyebrow">VouchNet Studio</p>
        <h1>Websites and product surfaces that feel considered from the first click.</h1>
        <p>
          Strategy, visual systems, and production engineering for organizations that need their
          site to work as hard as their team does.
        </p>
        <div>
          <Link className="primary-button" href="/studio/request">
            Start a technical brief
          </Link>
          <a className="secondary-button" href="#packages">
            View deposits
          </a>
        </div>
        <small>
          Core discovery is free. A scoped deposit starts implementation; the remaining balance is
          agreed in writing.
        </small>
      </section>
      <section id="packages" className="studio-section">
        <p className="eyebrow">Engagements</p>
        <h2>Choose a clear starting point.</h2>
        <div className="studio-package-grid">
          {Object.entries(studioPackages).map(([id, item]) => (
            <article className="studio-package" key={id}>
              <strong>{item.name}</strong>
              <p>{item.detail}</p>
              <b>
                {item.depositCents === null
                  ? 'Custom quote'
                  : `$${(item.depositCents / 100).toLocaleString()} deposit`}
              </b>
              <span>
                {id === 'CUSTOM'
                  ? 'A written scope and approved deposit come first.'
                  : 'Deposit reserves discovery and implementation planning.'}
              </span>
            </article>
          ))}
        </div>
      </section>
      <section className="studio-section studio-deliverables">
        <div>
          <p className="eyebrow">What is included</p>
          <h2>Design with technical accountability.</h2>
        </div>
        <ul>
          <li>Clear page architecture, interaction intent, and visual direction</li>
          <li>Responsive, accessible implementation with SEO fundamentals</li>
          <li>Defined acceptance criteria and documented handoff</li>
          <li>Private project files and a status dashboard</li>
        </ul>
      </section>
      <section className="studio-section">
        <p className="eyebrow">How it works</p>
        <ol className="studio-steps">
          <li>
            <b>1. Write the brief</b>
            <span>
              Tell us goals, constraints, required functionality, and how success is measured.
            </span>
          </li>
          <li>
            <b>2. Reserve with a deposit</b>
            <span>
              Packages use a server-verified Stripe Checkout deposit. Custom work receives a written
              quote first.
            </span>
          </li>
          <li>
            <b>3. Review and build</b>
            <span>
              Track the project in VouchNet Studio as it moves through review, execution, feedback,
              and completion.
            </span>
          </li>
        </ol>
      </section>
      <section className="studio-section">
        <p className="eyebrow">FAQ</p>
        <details>
          <summary>Can I submit an incomplete idea?</summary>
          <p>
            Not yet. The brief intentionally requires technical details, functionality, and
            acceptance criteria so we can evaluate fit responsibly.
          </p>
        </details>
        <details>
          <summary>Do I pay the full project cost at checkout?</summary>
          <p>
            No. Checkout collects only the stated package deposit or an approved custom deposit. Any
            remaining balance is agreed in the written scope.
          </p>
        </details>
        <details>
          <summary>Are files private?</summary>
          <p>
            Yes. Attachments are stored privately and require the authenticated request owner to
            download.
          </p>
        </details>
      </section>
    </main>
  );
}
