import { AuthForm } from '../components/auth-form';
import { AuthShell } from '../components/auth-shell';
import { OAuthButtons } from '../components/oauth-buttons';

const oauthErrors: Record<string, string> = {
  INVALID_CREDENTIALS:
    'That email or password is not correct. You can reset your password if needed.',
  SERVICE_UNAVAILABLE: 'Sign-in is temporarily unavailable. Please try again shortly.',
  OAUTH_UNAVAILABLE: 'That sign-in provider is not available yet. Please use email and password.',
  OAUTH_DENIED: 'The provider sign-in was cancelled.',
  OAUTH_STATE_INVALID: 'That sign-in attempt expired. Please try again.',
  OAUTH_EXCHANGE_FAILED: 'The provider could not complete sign-in. Please try again.',
  OAUTH_IDENTITY_INVALID: 'A verified email from the provider is required to sign in.',
  OAUTH_EMAIL_CONFLICT: 'That email already has a VouchNet account. Sign in with email instead.',
  OAUTH_REGISTRATION_INVALID: 'Your provider sign-up session expired. Please start again.',
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const safeNext =
    typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : null;
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Continue your professional story"
      description="Sign in to your profile, network, and saved professional context."
      footer={
        <>
          New to VouchNet? <a href="/signup">Create your profile</a>
          <a className="auth-secondary-link" href="/forgot-password">
            Forgot password?
          </a>
        </>
      }
    >
      {error !== undefined && oauthErrors[error] !== undefined ? (
        <p className="form-error" role="alert">
          {oauthErrors[error]}
        </p>
      ) : null}
      <OAuthButtons next={safeNext} />
      <AuthForm action="/api/auth/login">
        {safeNext !== null ? <input name="next" type="hidden" value={safeNext} /> : null}
        <label>
          Work email
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
        </label>
        <button className="auth-submit">Sign in to VouchNet</button>
      </AuthForm>
    </AuthShell>
  );
}
