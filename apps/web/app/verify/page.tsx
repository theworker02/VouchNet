import Link from 'next/link';
import { VerificationForm } from './verification-form';

export default async function VerifyEmail({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; email?: string; error?: string; token?: string }>;
}) {
  const { code, email, error, token } = await searchParams;
  const message =
    error === 'expired'
      ? 'That verification link is invalid or has expired. Request a new code from signup.'
      : error === 'invalid'
        ? 'That code could not be verified. Check the email and try again, or request a new code.'
        : null;
  return (
    <main className="auth verification-page">
      <Link className="brand" href="/">
        VouchNet
      </Link>
      <p className="eyebrow">One last step</p>
      <h1>Verify your email.</h1>
      <p className="verification-intro">
        We sent a six-digit code to your inbox. Enter it below and we’ll sign you in securely.
      </p>
      {message === null ? null : (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
      {token === undefined ? (
        <VerificationForm initialCode={code} initialEmail={email} />
      ) : (
        <form action="/api/auth/verify" method="post" className="verification-form">
          <input type="hidden" name="token" value={token} />
          <button>Verify email and continue</button>
        </form>
      )}
      <p className="verification-help">
        Code not there? Check spam, then wait a minute and start signup again to receive a new one.
      </p>
    </main>
  );
}
