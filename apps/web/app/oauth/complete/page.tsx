import Link from 'next/link';
import { AuthShell } from '../../components/auth-shell';

export default async function CompleteOAuthSignup({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthShell
      eyebrow="One last step"
      title="Confirm your VouchNet membership"
      description="Your sign-in provider confirmed your identity. Review and accept the VouchNet agreements to finish creating your account."
      footer={
        <>
          Already have a VouchNet account? <Link href="/login">Sign in</Link>
        </>
      }
    >
      {error === 'REQUIRED_AGREEMENTS' ? (
        <p className="form-error" role="alert">
          Both agreements are required to create an account.
        </p>
      ) : null}
      <form action="/api/auth/oauth/complete" className="oauth-complete-form" method="post">
        <label className="check">
          <input name="acceptsTerms" required type="checkbox" /> I accept the{' '}
          <Link href="/terms" target="_blank">
            Terms of Service
          </Link>
          .
        </label>
        <label className="check">
          <input name="acceptsPrivacy" required type="checkbox" /> I accept the{' '}
          <Link href="/privacy" target="_blank">
            Privacy Policy
          </Link>
          .
        </label>
        <button className="auth-submit">Create my VouchNet account</button>
      </form>
    </AuthShell>
  );
}
