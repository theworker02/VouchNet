import Link from 'next/link';
import { AuthForm } from '../components/auth-form';

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
    <main className="auth">
      <Link className="brand" href="/">
        VouchNet
      </Link>
      <h1>Create your professional identity</h1>
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
          Password
          <input
            name="password"
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        <label className="check">
          <input name="acceptsTerms" type="checkbox" required /> I accept the Terms of Service.
        </label>
        <label className="check">
          <input name="acceptsPrivacy" type="checkbox" required /> I accept the Privacy Policy.
        </label>
        <button>Create account</button>
      </AuthForm>
      <p>
        Already a member? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
