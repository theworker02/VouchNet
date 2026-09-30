import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

/** Shared entry point for credentials. It deliberately keeps identity actions server-backed. */
export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="About VouchNet">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div className="auth-story-copy">
          <p className="eyebrow">Professional signal, not noise</p>
          <h1>Put the work behind your next opportunity.</h1>
          <p>
            VouchNet is built for credible profiles, deliberate introductions, and useful
            professional context.
          </p>
        </div>
        <div className="auth-proof" aria-label="VouchNet principles">
          <div>
            <span className="auth-proof-icon" aria-hidden="true">
              ✓
            </span>
            <p>
              <strong>Human participation</strong>
              <small>People stay in control of consequential actions.</small>
            </p>
          </div>
          <div>
            <span className="auth-proof-icon" aria-hidden="true">
              ↗
            </span>
            <p>
              <strong>Work with context</strong>
              <small>Share skills, projects, and perspective—not just a title.</small>
            </p>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="auth-description">{description}</p>
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
        <p className="auth-privacy-note">
          Your credentials are protected with secure, server-managed sessions.
        </p>
      </section>
    </main>
  );
}
