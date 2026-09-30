'use client';

import { ClipboardEvent, KeyboardEvent, useRef, useState } from 'react';

type VerificationFormProps = {
  initialCode?: string | undefined;
  initialEmail?: string | undefined;
};

function toDigits(value: string): string[] {
  return value.replace(/\D/g, '').slice(0, 6).split('');
}

export function VerificationForm({ initialCode = '', initialEmail = '' }: VerificationFormProps) {
  const [digits, setDigits] = useState(() =>
    Array.from({ length: 6 }, (_, index) => toDigits(initialCode)[index] ?? ''),
  );
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  function applyDigits(start: number, incoming: string) {
    const next = [...digits];
    const replacement = toDigits(incoming);
    if (replacement.length === 0) next[start] = '';
    replacement.forEach((digit, offset) => {
      if (start + offset < next.length) next[start + offset] = digit;
    });
    setDigits(next);
    const nextIndex = Math.min(start + Math.max(replacement.length, 1), next.length - 1);
    inputs.current[nextIndex]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && digits[index] === '' && index > 0) {
      event.preventDefault();
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    applyDigits(index, event.clipboardData.getData('text'));
  }

  return (
    <form action="/api/auth/verify" method="post" className="verification-form">
      <label>
        Email address
        <input
          name="email"
          type="email"
          defaultValue={initialEmail}
          autoComplete="email"
          required
        />
      </label>
      <fieldset>
        <legend>Verification code</legend>
        <p>Enter the six-digit code from your VouchNet email.</p>
        <div className="verification-code" aria-label="Six-digit verification code">
          {digits.map((digit, index) => (
            <input
              aria-label={`Verification digit ${index + 1}`}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              inputMode="numeric"
              key={index}
              maxLength={6}
              onChange={(event) => applyDigits(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={(event) => handlePaste(index, event)}
              ref={(element) => {
                inputs.current[index] = element;
              }}
              type="text"
              value={digit}
            />
          ))}
        </div>
      </fieldset>
      <input name="code" type="hidden" value={digits.join('')} />
      <button disabled={digits.join('').length !== 6}>Verify and continue</button>
    </form>
  );
}
