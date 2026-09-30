'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

type RequestState = 'idle' | 'submitting' | 'success' | 'error';

export function PasswordResetRequestForm() {
  const [state, setState] = useState<RequestState>('idle');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('submitting');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: new FormData(event.currentTarget).get('email') }),
      });
      setState(response.ok ? 'success' : 'error');
    } catch {
      setState('error');
    }
  }

  return state === 'success' ? (
    <section aria-live="polite" className="auth-confirmation">
      <h2>Check your inbox</h2>
      <p>If an account matches that email address, reset instructions are on their way.</p>
      <Link className="auth-submit" href="/login">
        Return to sign in
      </Link>
    </section>
  ) : (
    <form onSubmit={(event) => void submit(event)}>
      <label>
        Work email
        <input autoComplete="email" name="email" required type="email" />
      </label>
      {state === 'error' ? (
        <p className="form-error" role="alert">
          We could not process that request. Check your connection and try again.
        </p>
      ) : null}
      <button className="auth-submit" disabled={state === 'submitting'} type="submit">
        {state === 'submitting' ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}

export function PasswordResetForm({ token }: { token: string | null }) {
  const [state, setState] = useState<RequestState>('idle');

  if (token === null) {
    return (
      <section aria-live="polite" className="auth-confirmation">
        <h2>This reset link is incomplete.</h2>
        <p>Request a new reset link and use the most recent email.</p>
        <Link className="auth-submit" href="/forgot-password">
          Request a reset link
        </Link>
      </section>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get('password');
    setState('submitting');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      setState(response.ok ? 'success' : 'error');
    } catch {
      setState('error');
    }
  }

  return state === 'success' ? (
    <section aria-live="polite" className="auth-confirmation">
      <h2>Your password has been updated.</h2>
      <p>You can now sign in with your new password.</p>
      <Link className="auth-submit" href="/login">
        Sign in to VouchNet
      </Link>
    </section>
  ) : (
    <form onSubmit={(event) => void submit(event)}>
      <label>
        New password <small>12 characters minimum</small>
        <input
          autoComplete="new-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </label>
      {state === 'error' ? (
        <p className="form-error" role="alert">
          This link is invalid or expired. Request a new reset link and try again.
        </p>
      ) : null}
      <button className="auth-submit" disabled={state === 'submitting'} type="submit">
        {state === 'submitting' ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  );
}
