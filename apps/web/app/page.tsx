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
      <section className="landing-hero landing-hero-simple">
        <p className="eyebrow">A professional network for people</p>
        <h1>Make your next move with confidence.</h1>
        <p>
          Build a credible professional presence, discover meaningful work, and make connections
          that are grounded in context—not noise.
        </p>
        <div className="actions">
          <Link className="primary" href="/signup">
            Build your profile
          </Link>
          <Link className="secondary" href="/login">
            Explore VouchNet
          </Link>
        </div>
      </section>
      <section className="landing-links" aria-label="Explore VouchNet">
        <Link href="/signup">
          <span>01</span>
          <h2>Build your profile</h2>
          <p>Present your experience, skills, and professional story in one clear place.</p>
          <b>Get started →</b>
        </Link>
        <Link href="/login">
          <span>02</span>
          <h2>Find the right work</h2>
          <p>Explore transparent opportunities and keep your search organized.</p>
          <b>Explore jobs →</b>
        </Link>
        <Link href="/login">
          <span>03</span>
          <h2>Grow your network</h2>
          <p>Meet professionals through shared context and deliberate connection requests.</p>
          <b>Meet people →</b>
        </Link>
      </section>
      <section className="landing-close">
        <p className="eyebrow">Built for deliberate careers</p>
        <h2>Make the next professional move with context.</h2>
        <Link className="primary" href="/signup">
          Create your VouchNet profile
        </Link>
      </section>
    </main>
  );
}
