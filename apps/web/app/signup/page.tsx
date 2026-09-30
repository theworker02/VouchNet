import { AuthForm } from '../components/auth-form';
import { AuthShell } from '../components/auth-shell';
import Link from 'next/link';

const signupErrors = {
  ACCOUNT_EXISTS: 'If an account already exists for this email, sign in or reset its password.',
  INVALID_INPUT: 'Please check your details, password, and required agreements, then try again.',
  VERIFICATION_RECENTLY_SENT:
    'A verification email was sent recently. Please wait one minute before trying again.',
  SERVICE_UNAVAILABLE:
    'We could not create your account right now. Please try again shortly or contact support.',
} as const;

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message =
    error !== undefined && error in signupErrors
      ? signupErrors[error as keyof typeof signupErrors]
      : null;
  return (
    <AuthShell
      eyebrow="Create your profile"
      title="Start with the work you want to be known for"
      description="Set up your account in a few minutes, then add the professional context that matters."
      footer={
        <>
          Already have an account? <a href="/login">Sign in</a>
        </>
      }
    >
      {message !== null ? (
        <p className="form-error" role="alert">
          {message}
        </p>
      ) : null}
      <AuthForm action="/api/auth/register">
        <div className="two">
          <label>
            First name
            <input name="firstName" required autoComplete="given-name" />
          </label>
          <label>
            Last name
            <input name="lastName" required autoComplete="family-name" />
          </label>
        </div>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password <small>12 characters minimum</small>
          <input
            name="password"
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        <div className="auth-agreements">
          <label className="check">
            <input name="acceptsTerms" type="checkbox" required /> I accept the{' '}
            <Link href="/terms" target="_blank">
              Terms of Service
            </Link>
            .
          </label>
          <label className="check">
            <input name="acceptsPrivacy" type="checkbox" required /> I accept the{' '}
            <Link href="/privacy" target="_blank">
              Privacy Policy
            </Link>
            .
          </label>
        </div>
        <button className="auth-submit">Create account</button>
      </AuthForm>
    </AuthShell>
  );
}
