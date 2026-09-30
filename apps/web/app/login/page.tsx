import { AuthForm } from '../components/auth-form';
import { AuthShell } from '../components/auth-shell';

export default function Login() {
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
      <AuthForm action="/api/auth/login">
        <label>
          Work email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="auth-submit">Sign in to VouchNet</button>
      </AuthForm>
    </AuthShell>
  );
}
