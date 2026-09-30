import Link from 'next/link';
import { VerifiedWorkBadge } from './components/verified-work-badge';

export default function HomePage() {
  return (
    <main className="landing">
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
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">The professional network for real work</p>
          <h1>Show what you can do. Not just where you have been.</h1>
          <p>
            A higher-signal place to build a profile, earn trusted Vouches, and take your work into
            the opportunities that actually fit.
          </p>
          <div className="actions">
            <Link className="primary" href="/signup">
              Build your profile
            </Link>
            <Link className="secondary" href="/login">
              See how it works
            </Link>
          </div>
          <div className="landing-proof-points">
            <span>Proof over performance</span>
            <span>Vouched by peers</span>
            <span>Privacy by default</span>
          </div>
        </div>
        <div className="landing-product-preview" aria-label="Example VouchNet profile workspace">
          <div className="preview-toolbar">
            <span className="preview-mark">V</span>
            <span>My signal desk</span>
            <i />
            <i />
          </div>
          <div className="preview-profile-row">
            <div className="preview-person">AR</div>
            <div>
              <strong>Alex Rivera</strong>
              <span>Product engineer · Brooklyn, NY</span>
            </div>
            <VerifiedWorkBadge compact />
          </div>
          <span className="preview-badge-inspector" aria-label="Inspect verified work">
            <span aria-hidden="true">⌕</span>
            <i />
          </span>
          <article className="preview-signal-card">
            <div className="preview-signal-header">
              <span>PROJECT NOTE</span>
              <time>Today</time>
            </div>
            <h2>What made our release handoff simpler</h2>
            <p>
              A small shared contract removed three recurring coordination steps from the release
              process.
            </p>
            <div className="preview-signal-tags">
              <span>Delivery systems</span>
              <span>Peer verified</span>
            </div>
          </article>
          <div className="preview-insight-row">
            <div>
              <small>Professional context</small>
              <strong>Projects · skills · work history</strong>
            </div>
            <div className="preview-spark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="preview-trust-row">
            <span>
              <b>12</b> people vouched
            </span>
            <span>
              <b>4</b> projects
            </span>
            <span className="preview-live">● Open to work</span>
          </div>
        </div>
      </section>
      <section className="landing-outcomes" aria-label="What VouchNet makes easier">
        <div>
          <span>01</span>
          <strong>Build a living profile</strong>
          <p>Bring projects, experience, skills, and evidence together in one credible place.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Carry your application</strong>
          <p>Use Apply with VouchNet to share only the data you approve with a hiring site.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Keep control</strong>
          <p>
            Every consequential action stays attributable to a person, never an automated account.
          </p>
        </div>
      </section>
      <section className="landing-principles" aria-label="VouchNet principles">
        <article>
          <span>01</span>
          <h2>Show the work</h2>
          <p>
            Turn professional experience into useful, readable context—not a static list of titles.
          </p>
        </article>
        <article>
          <span>02</span>
          <h2>Choose the signal</h2>
          <p>
            Read chronologically or use peer-verified signal when quality matters more than volume.
          </p>
        </article>
        <article>
          <span>03</span>
          <h2>Own the action</h2>
          <p>
            Automation can assist, but people approve meaningful professional actions themselves.
          </p>
        </article>
      </section>
      <section className="landing-close">
        <p className="eyebrow">Build a credible next chapter</p>
        <h2>Make the next professional move with more context and less performance.</h2>
        <Link className="primary" href="/signup">
          Create your VouchNet profile
        </Link>
      </section>
    </main>
  );
}
