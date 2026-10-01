'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { VerifiedWorkBadge } from './components/verified-work-badge';
import { ButtonLink } from './components/ui/button';
import { useMotionPreference } from './lib/motion';

function reveal(reducedMotion: boolean, delay = 0) {
  if (reducedMotion) return {};
  return {
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.18 },
    transition: { duration: 0.48, delay, ease: [0.16, 1, 0.3, 1] as const },
  };
}

export default function HomePage() {
  const motionPreference = useMotionPreference();
  const reducedMotion = motionPreference.reducedMotion;
  return (
    <main className="landing landing--refined">
      <motion.header className="public-nav public-nav--refined" {...reveal(reducedMotion)}>
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <nav aria-label="Public navigation" className="public-nav-links">
          <Link href="/explore">Explore</Link>
          <Link href="/jobs">Jobs</Link>
          <Link href="/developers">Developers</Link>
          <a href="https://github.com/theworker02/VouchNet" rel="noreferrer" target="_blank">
            Repository
          </a>
        </nav>
        <div className="public-nav-actions">
          <Link className="public-nav-signin" href="/login">
            Sign in
          </Link>
          <ButtonLink href="/signup" size="sm">
            Build your profile
          </ButtonLink>
        </div>
      </motion.header>

      <section className="landing-hero landing-hero--refined">
        <motion.div className="landing-copy landing-copy--refined" {...reveal(reducedMotion, 0.04)}>
          <p className="eyebrow">Professional context, not professional noise</p>
          <h1>
            Proof that travels <em>with your work.</em>
          </h1>
          <p className="landing-lede">
            VouchNet brings your experience, project context, trusted peer signals, and next
            opportunities into one deliberate professional identity.
          </p>
          <div className="landing-actions">
            <ButtonLink href="/signup" size="lg">
              Build your profile
            </ButtonLink>
            <ButtonLink href="/explore" size="lg" variant="secondary">
              Explore the network
            </ButtonLink>
          </div>
          <dl className="landing-facts">
            <div>
              <dt>Portable</dt>
              <dd>Use your approved profile when you apply.</dd>
            </div>
            <div>
              <dt>Human-led</dt>
              <dd>Meaningful actions stay under your control.</dd>
            </div>
            <div>
              <dt>Evidence-first</dt>
              <dd>Vouches add context, not vanity metrics.</dd>
            </div>
          </dl>
        </motion.div>

        <motion.div
          className="landing-workspace"
          aria-label="VouchNet profile workspace preview"
          {...reveal(reducedMotion, 0.12)}
          {...(reducedMotion
            ? {}
            : {
                whileHover: { y: -3, transition: { duration: 0.18 } },
              })}
        >
          <div className="workspace-topline">
            <span className="workspace-brand-mark" aria-hidden="true">
              V
            </span>
            <span>Professional identity</span>
            <span className="workspace-status">Live profile</span>
          </div>
          <div className="workspace-profile">
            <span className="workspace-avatar" aria-hidden="true">
              AR
            </span>
            <div>
              <strong>Alex Rivera</strong>
              <span>Product engineer · Brooklyn, NY</span>
            </div>
            <VerifiedWorkBadge compact />
          </div>
          <div className="workspace-badge-lens" aria-hidden="true">
            <svg fill="none" viewBox="0 0 24 24">
              <circle cx="10.5" cy="10.5" r="5.5" />
              <path d="m15 15 4.5 4.5" />
              <path d="m8.2 10.5 1.5 1.5 3.1-3.1" />
            </svg>
            <span>Verified work</span>
          </div>
          <div className="workspace-grid">
            <article className="workspace-featured-work">
              <span className="workspace-kicker">FEATURED WORK</span>
              <h2>Release handoff that made room for better decisions.</h2>
              <p>
                A concise systems note that explains the trade-offs, the collaborators, and what
                changed.
              </p>
              <footer>
                <span>Delivery systems</span>
                <span>Peer context attached</span>
              </footer>
            </article>
            <aside className="workspace-proof-panel">
              <div>
                <small>Peer signals</small>
                <strong>12</strong>
                <span>specific Vouches</span>
              </div>
              <div className="workspace-proof-list">
                <span>Reliable delivery</span>
                <span>Clear collaboration</span>
                <span>Thoughtful craft</span>
              </div>
            </aside>
          </div>
          <div className="workspace-application">
            <span className="workspace-application-icon" aria-hidden="true">
              ↗
            </span>
            <div>
              <strong>Ready when an opportunity fits</strong>
              <span>Share only the profile details you approve.</span>
            </div>
            <span className="workspace-application-state">Approved</span>
          </div>
        </motion.div>
      </section>

      <section className="landing-directives" aria-label="VouchNet principles">
        <motion.article {...reveal(reducedMotion)}>
          <span>01</span>
          <h2>Build a living profile</h2>
          <p>Bring projects, skills, experience, and the decisions behind your work together.</p>
        </motion.article>
        <motion.article {...reveal(reducedMotion, 0.07)}>
          <span>02</span>
          <h2>Earn useful signal</h2>
          <p>Peer Vouches are specific to how you showed up—not generic reaction inflation.</p>
        </motion.article>
        <motion.article {...reveal(reducedMotion, 0.14)}>
          <span>03</span>
          <h2>Carry it forward</h2>
          <p>
            Apply with VouchNet lets you share a consented professional profile when it matters.
          </p>
        </motion.article>
      </section>

      <motion.section
        className="landing-product-visuals"
        aria-label="VouchNet product previews"
        {...reveal(reducedMotion)}
      >
        <motion.div
          className="landing-photo-card"
          {...(reducedMotion ? {} : { whileHover: { y: -3, transition: { duration: 0.18 } } })}
        >
          <Image
            alt="A modern software workspace"
            height={700}
            priority={false}
            sizes="(max-width: 800px) 100vw, 52vw"
            src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80"
            width={1200}
          />
          <div>
            <span>SHOW THE WORK</span>
            <strong>Context that survives the handoff.</strong>
          </div>
        </motion.div>
        <motion.div className="landing-live-previews" {...reveal(reducedMotion, 0.09)}>
          <Link href="/feed">
            <span>01 · Feed</span>
            <strong>Chronological when you need it. Peer signal when you don’t.</strong>
            <small>Read real member posts and choose the ordering.</small>
          </Link>
          <Link href="/jobs">
            <span>02 · Jobs</span>
            <strong>Compensation context before an application handoff.</strong>
            <small>Source-linked roles with public salary disclosure.</small>
          </Link>
          <Link href="/developers">
            <span>03 · Apply with VouchNet</span>
            <strong>Consent-based professional data sharing for trusted integrations.</strong>
            <small>Explore the developer portal and scoped OAuth flow.</small>
          </Link>
        </motion.div>
      </motion.section>

      <motion.section className="landing-close landing-close--refined" {...reveal(reducedMotion)}>
        <div>
          <p className="eyebrow">A more credible next step</p>
          <h2>Make your professional context worth opening.</h2>
        </div>
        <ButtonLink href="/signup" size="lg">
          Create your profile
        </ButtonLink>
      </motion.section>
    </main>
  );
}
