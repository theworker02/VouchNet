import Link from 'next/link';
import { AuthShell } from '../components/auth-shell';
import { PasswordResetRequestForm } from '../components/password-recovery-forms';

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      description="Enter the email for your VouchNet account and we’ll send a one-hour reset link."
      eyebrow="Account recovery"
      footer={
        <>
          Remembered your password? <Link href="/login">Return to sign in</Link>
        </>
      }
      title="Reset your password"
    >
      <PasswordResetRequestForm />
    </AuthShell>
  );
}
