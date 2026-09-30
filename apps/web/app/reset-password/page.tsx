import Link from 'next/link';
import { AuthShell } from '../components/auth-shell';
import { PasswordResetForm } from '../components/password-recovery-forms';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthShell
      description="Choose a new password for your VouchNet account."
      eyebrow="Account recovery"
      footer={
        <>
          Need a new link? <Link href="/forgot-password">Request another reset email</Link>
        </>
      }
      title="Set a new password"
    >
      <PasswordResetForm token={typeof token === 'string' ? token : null} />
    </AuthShell>
  );
}
