import Link from 'next/link';

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
          <p className="eyebrow">A calmer professional network</p>
          <h1>Make your next move with evidence behind it.</h1>
          <p>
            Build a credible professional presence, discover meaningful work, and make relationships
            through context—not professional noise.
          </p>
          <div className="actions">
            <Link className="primary" href="/signup">
              Build your profile
            </Link>
            <Link className="secondary" href="/login">
              Explore VouchNet
            </Link>
          </div>
          <div className="landing-proof-points">
            <span>Deliberate connections</span>
            <span>Useful work, first</span>
            <span>Humans stay in control</span>
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
            <b>Verified work</b>
          </div>
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
