import Link from 'next/link';
import { AuthForm } from '../components/auth-form';

export default function Login() {
  return (
    <main className="auth">
      <Link className="brand" href="/">
        VouchNet
      </Link>
      <h1>Welcome back</h1>
      <AuthForm action="/api/auth/login">
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button>Sign in</button>
      </AuthForm>
      <p>
        <Link href="/signup">Create an account</Link> ·{' '}
        <Link href="/forgot-password">Forgot password?</Link>
      </p>
    </main>
  );
}
