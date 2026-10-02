import Link from 'next/link';
import { OAuthProviderMark } from './oauth-provider-mark';

const providers = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'github', label: 'Continue with GitHub' },
  { id: 'linkedin', label: 'Continue with LinkedIn' },
] as const;

/** These links start server-side authorization-code flows; no provider token reaches the browser app. */
export function OAuthButtons({ next }: { next?: string | null }) {
  return (
    <div className="oauth-buttons" aria-label="Sign in with a provider">
      <div className="oauth-divider">
        <span>or continue with</span>
      </div>
      <div className="oauth-button-grid">
        {providers.map((provider) => (
          <Link
            href={`/api/auth/oauth/${provider.id}${next !== null && next !== undefined ? `?next=${encodeURIComponent(next)}` : ''}`}
            key={provider.id}
            className={`oauth-button oauth-button-${provider.id}`}
          >
            <OAuthProviderMark provider={provider.id} />
            <span>{provider.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
