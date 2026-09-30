import Link from 'next/link';
export default function Login() {
  return (
    <main className="auth">
      <Link className="brand" href="/">
        VouchNet
      </Link>
      <h1>Welcome back</h1>
      <form action="/api/auth/login" method="post">
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button>Sign in</button>
      </form>
      <p>
        <Link href="/signup">Create an account</Link> ·{' '}
        <Link href="/forgot-password">Forgot password?</Link>
      </p>
    </main>
  );
}
