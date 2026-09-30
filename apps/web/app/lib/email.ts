const resendEndpoint = 'https://api.resend.com/emails';

function appUrl(): string {
  const value = process.env.APP_URL ?? 'http://localhost:3002';
  return new URL(value).origin;
}

function htmlEscape(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character] ?? character;
  });
}

async function sendEmail(input: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (apiKey === undefined || from === undefined) throw new Error('EMAIL_PROVIDER_UNCONFIGURED');
  const response = await fetch(resendEndpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
  });
  if (!response.ok) throw new Error('EMAIL_DELIVERY_FAILED');
}

export async function sendVerificationEmail(input: {
  email: string;
  firstName: string;
  token: string;
}): Promise<void> {
  const verificationUrl = new URL('/verify', appUrl());
  verificationUrl.searchParams.set('token', input.token);
  const name = htmlEscape(input.firstName);
  await sendEmail({
    to: input.email,
    subject: 'Verify your VouchNet email',
    html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px"><h1>Welcome to VouchNet, ${name}.</h1><p>Confirm your email to activate your professional profile.</p><p><a href="${verificationUrl.toString()}" style="display:inline-block;padding:12px 18px;background:#2457d6;color:#fff;text-decoration:none;border-radius:6px">Verify email</a></p><p style="color:#667085">This link expires in 24 hours. If you did not create this account, you can ignore this message.</p></main>`,
  });
}

export async function sendPasswordResetEmail(input: {
  email: string;
  token: string;
}): Promise<void> {
  const resetUrl = new URL('/reset-password', appUrl());
  resetUrl.searchParams.set('token', input.token);
  await sendEmail({
    to: input.email,
    subject: 'Reset your VouchNet password',
    html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px"><h1>Reset your password</h1><p>Use the secure link below to choose a new password.</p><p><a href="${resetUrl.toString()}" style="display:inline-block;padding:12px 18px;background:#2457d6;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p><p style="color:#667085">This link expires in one hour. If you did not request it, you can ignore this message.</p></main>`,
  });
}
