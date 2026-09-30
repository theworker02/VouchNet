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

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (apiKey === undefined || from === undefined) throw new Error('EMAIL_PROVIDER_UNCONFIGURED');
  const response = await fetch(resendEndpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });
  if (!response.ok) throw new Error('EMAIL_DELIVERY_FAILED');
}

export async function sendVerificationEmail(input: {
  email: string;
  firstName: string;
  code: string;
}): Promise<void> {
  const name = htmlEscape(input.firstName);
  const verificationUrl = new URL('/verify', appUrl()).toString();
  await sendEmail({
    to: input.email,
    subject: `${input.code} is your VouchNet verification code`,
    text: `Welcome to VouchNet, ${input.firstName}.\n\nYour verification code is ${input.code}. Enter it at ${verificationUrl}.\n\nThe code expires in 24 hours and can be tried five times. Do not share it with anyone. If you did not create a VouchNet account, you can ignore this email.`,
    html: `<!doctype html><html><body style="margin:0;background:#f2f5f9;color:#172033;font-family:Inter,Arial,sans-serif"><main style="max-width:600px;margin:0 auto;padding:36px 16px"><section style="overflow:hidden;border:1px solid #d9e1ee;border-radius:20px;background:#ffffff;box-shadow:0 12px 36px rgba(15,35,70,.10)"><header style="padding:28px 32px;background:linear-gradient(135deg,#103372,#2463d4);color:#ffffff"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:38px;height:38px;border-radius:11px;background:#ffffff;color:#1d56be;font-size:23px;font-weight:800;text-align:center">V</td><td style="padding-left:11px;font-size:19px;font-weight:800;letter-spacing:-.3px">VouchNet</td></tr></table></header><div style="padding:34px 32px"><p style="margin:0 0 14px;color:#2463d4;font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase">Secure account verification</p><h1 style="margin:0 0 14px;font-size:30px;line-height:1.18;letter-spacing:-.6px">Welcome, ${name}.</h1><p style="margin:0;color:#526174;font-size:16px;line-height:1.65">Enter this one-time code in VouchNet to activate your professional profile.</p><div style="margin:28px 0;padding:22px;border:1px solid #cddafb;border-radius:14px;background:#f4f7ff;text-align:center;color:#133c87;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:800;letter-spacing:9px">${input.code}</div><p style="margin:0 0 22px;color:#526174;font-size:14px;line-height:1.55">This code expires in 24 hours and can be tried five times. VouchNet will never ask you to share it.</p><a href="${verificationUrl}" style="display:inline-block;padding:13px 18px;border-radius:9px;background:#2463d4;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Open VouchNet</a></div><footer style="padding:20px 32px;border-top:1px solid #e4e9f1;color:#778397;font-size:12px;line-height:1.5">If you did not create a VouchNet account, you can safely ignore this email.</footer></section></main></body></html>`,
  });
}

export async function sendVerificationLinkEmail(input: {
  email: string;
  firstName: string;
  token: string;
}): Promise<void> {
  const verificationUrl = new URL('/auth/verify-email', appUrl());
  verificationUrl.searchParams.set('token', input.token);
  const name = htmlEscape(input.firstName);
  await sendEmail({
    to: input.email,
    subject: 'Confirm your VouchNet email address',
    text: `Confirm your VouchNet email address: ${verificationUrl.toString()}\n\nThis link expires in 24 hours. If you did not request it, you can ignore this email.`,
    html: `<!doctype html><html><body style="margin:0;background:#f2f5f9;color:#172033;font-family:Inter,Arial,sans-serif"><main style="max-width:600px;margin:0 auto;padding:36px 16px"><section style="overflow:hidden;border:1px solid #d9e1ee;border-radius:20px;background:#ffffff;box-shadow:0 12px 36px rgba(15,35,70,.10)"><header style="padding:28px 32px;background:linear-gradient(135deg,#103372,#2463d4);color:#ffffff"><strong style="font-size:19px">VouchNet</strong></header><div style="padding:34px 32px"><p style="margin:0 0 14px;color:#2463d4;font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase">Email confirmation</p><h1 style="margin:0 0 14px;font-size:30px;line-height:1.18">Confirm your email, ${name}.</h1><p style="margin:0;color:#526174;font-size:16px;line-height:1.65">Use this secure, one-time link to confirm that you control this address.</p><a href="${verificationUrl.toString()}" style="display:inline-block;margin-top:26px;padding:13px 18px;border-radius:9px;background:#2463d4;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Confirm email address</a><p style="margin:24px 0 0;color:#778397;font-size:13px;line-height:1.5">The link expires in 24 hours and can only be used once. If you did not request it, you can safely ignore this email.</p></div></section></main></body></html>`,
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
    text: `Reset your VouchNet password at ${resetUrl.toString()}. This link expires in one hour.`,
    html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px"><h1>Reset your password</h1><p>Use the secure link below to choose a new password.</p><p><a href="${resetUrl.toString()}" style="display:inline-block;padding:12px 18px;background:#2457d6;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p><p style="color:#667085">This link expires in one hour. If you did not request it, you can ignore this message.</p></main>`,
  });
}
