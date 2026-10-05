import { AuthForm } from '../../components/auth-form';
import { AuthShell } from '../../components/auth-shell';

export default async function MfaLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const safeNext =
    typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/home';
  return (
    <AuthShell
      eyebrow="Secure sign-in"
      title="Confirm it’s you"
      description="Open Google Authenticator and enter the current six-digit code for VouchNet. A saved recovery code also works once."
      footer={
        <>
          Need to start again? <a href="/login">Return to sign in</a>
        </>
      }
    >
      {error === 'INVALID_CODE' ? (
        <p className="form-error" role="alert">
          That code was not accepted. Check your authenticator and try again.
        </p>
      ) : null}
      <AuthForm action="/api/auth/mfa/verify">
        <input name="next" type="hidden" value={safeNext} />
        <label>
          Authentication code
          <input
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={32}
            name="code"
            pattern="[0-9A-Za-z-]+"
            placeholder="123456"
            required
          />
        </label>
        <button className="auth-submit">Verify and continue</button>
      </AuthForm>
    </AuthShell>
  );
}
