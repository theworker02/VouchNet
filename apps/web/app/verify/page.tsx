import Link from 'next/link';

export default async function VerifyEmail({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <main className="auth">
      <Link className="brand" href="/">
        VouchNet
      </Link>
      <h1>Verify your email</h1>
      {error === 'expired' ? (
        <p className="form-error">That verification link is invalid or has expired.</p>
      ) : (
        <p>
          Confirm your email before you can sign in. In local development, VouchNet uses a visible
          delivery adapter so this flow can be tested without an email provider.
        </p>
      )}
      {token === undefined ? (
        <p>Open the verification link sent to your email address.</p>
      ) : (
        <form action="/api/auth/verify" method="post">
          <input type="hidden" name="token" value={token} />
          <button>Verify email and continue</button>
        </form>
      )}
    </main>
  );
}
