import Link from 'next/link';

const providers = [
  { id: 'google', label: 'Continue with Google', mark: 'G' },
  { id: 'github', label: 'Continue with GitHub', mark: 'GH' },
  { id: 'linkedin', label: 'Continue with LinkedIn', mark: 'in' },
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
            className="oauth-button"
          >
            <span aria-hidden="true" className={`oauth-mark oauth-mark-${provider.id}`}>
              {provider.mark}
            </span>
            {provider.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
