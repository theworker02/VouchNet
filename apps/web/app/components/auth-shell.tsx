import Link from 'next/link';
import type { ReactNode } from 'react';
import { VouchNetLogo } from './brand';

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
        <Link className="auth-brand" href="/" aria-label="VouchNet home">
          <VouchNetLogo />
        </Link>
        <div className="auth-story-copy">
          <p className="eyebrow">A better professional starting point</p>
          <h1>Bring your work into focus.</h1>
          <p>
            A focused space for your professional context, your trusted network, and your next
            opportunity.
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
        <div className="auth-card vn-surface vn-surface--raised">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="auth-description">{description}</p>
          <div className="auth-card-assurance" aria-label="Sign-in protections">
            <span className="vn-status vn-status--positive">
              <i aria-hidden="true" />
              Secure session
            </span>
            <span className="vn-status">Private by default</span>
          </div>
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
