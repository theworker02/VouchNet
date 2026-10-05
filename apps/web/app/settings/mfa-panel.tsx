'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Enrollment = { manualKey: string; otpauthUri: string; expiresAt: string };

export function MfaPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch('/api/auth/mfa/status')
      .then((response) =>
        response.ok ? (response.json() as Promise<{ enabled: boolean }>) : Promise.reject(),
      )
      .then((payload) => setEnabled(payload.enabled))
      .catch(() => setStatus('Two-factor authentication is temporarily unavailable.'));
  }, []);

  async function startEnrollment() {
    setBusy(true);
    setStatus(null);
    setBackupCodes(null);
    try {
      const response = await fetch('/api/auth/mfa/enroll', { method: 'POST' });
      if (!response.ok) throw new Error();
      const next = (await response.json()) as Enrollment;
      setEnrollment(next);
      setQr(
        await QRCode.toDataURL(next.otpauthUri, {
          width: 224,
          margin: 1,
          errorCorrectionLevel: 'M',
        }),
      );
    } catch {
      setStatus('We could not start Google Authenticator enrollment. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment() {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch('/api/auth/mfa/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { recoveryCodes: string[] };
      setBackupCodes(payload.recoveryCodes);
      setEnrollment(null);
      setQr(null);
      setEnabled(true);
      setCode('');
    } catch {
      setStatus('That six-digit code was not accepted. Check Google Authenticator and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) throw new Error();
      setEnabled(false);
      setCode('');
      setBackupCodes(null);
    } catch {
      setStatus('Enter a current authenticator or unused recovery code to turn off MFA.');
    } finally {
      setBusy(false);
    }
  }

  if (enabled === null) return <p className="muted-copy">Checking two-factor authentication…</p>;
  if (backupCodes !== null)
    return (
      <section className="mfa-card recovery-codes">
        <p className="eyebrow">Save these now</p>
        <h2>Recovery codes</h2>
        <p>
          Each code works once if you lose your phone. Store them in a password manager; they cannot
          be shown again.
        </p>
        <div>
          {backupCodes.map((recoveryCode) => (
            <code key={recoveryCode}>{recoveryCode}</code>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(backupCodes.join('\n'))}
        >
          Copy recovery codes
        </button>
      </section>
    );
  if (enrollment !== null)
    return (
      <section className="mfa-card">
        <p className="eyebrow">Google Authenticator</p>
        <h2>Scan and confirm</h2>
        <ol>
          <li>
            Open Google Authenticator and select <strong>+</strong>.
          </li>
          <li>
            Choose <strong>Scan a QR code</strong>.
          </li>
          <li>Enter the six-digit code shown for VouchNet.</li>
        </ol>
        {qr !== null ? (
          <img alt="Scan this QR code with Google Authenticator" className="mfa-qr" src={qr} />
        ) : null}
        <details>
          <summary>Can’t scan the code?</summary>
          <code className="mfa-manual-key">{enrollment.manualKey}</code>
        </details>
        <label>
          Six-digit code
          <input
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            value={code}
          />
        </label>
        <div className="mfa-actions">
          <button
            disabled={busy || code.length !== 6}
            onClick={() => void confirmEnrollment()}
            type="button"
          >
            {busy ? 'Confirming…' : 'Confirm and enable'}
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              setEnrollment(null);
              setQr(null);
              setCode('');
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
        {status !== null ? <p className="form-error">{status}</p> : null}
      </section>
    );
  if (!enabled)
    return (
      <section className="mfa-card">
        <p className="eyebrow">Google Authenticator</p>
        <h2>Add an authenticator app</h2>
        <p>
          Protect your VouchNet account with a six-digit code from Google Authenticator at sign-in.
        </p>
        <button disabled={busy} onClick={() => void startEnrollment()} type="button">
          {busy ? 'Preparing secure setup…' : 'Set up Google Authenticator'}
        </button>
        {status !== null ? <p className="form-error">{status}</p> : null}
      </section>
    );
  return (
    <section className="mfa-card">
      <p className="eyebrow">Google Authenticator</p>
      <h2>Two-factor authentication is on</h2>
      <p>
        Your account requires your Google Authenticator code after password sign-in. Keep your
        recovery codes in a secure place.
      </p>
      <label>
        Current authenticator or recovery code
        <input
          autoComplete="one-time-code"
          onChange={(event) => setCode(event.target.value)}
          placeholder="123456 or ABCDE-FGHIJ"
          value={code}
        />
      </label>
      <button
        className="danger-button"
        disabled={busy || code.trim().length < 6}
        onClick={() => void turnOff()}
        type="button"
      >
        {busy ? 'Turning off…' : 'Turn off two-factor authentication'}
      </button>
      {status !== null ? <p className="form-error">{status}</p> : null}
    </section>
  );
}
