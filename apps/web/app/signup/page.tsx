import Link from 'next/link';
export default function Signup() {
  return (
    <main className="auth">
      <Link className="brand" href="/">
        VouchNet
      </Link>
      <h1>Create your professional identity</h1>
      <form action="/api/auth/register" method="post">
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
      </form>
      <p>
        Already a member? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
