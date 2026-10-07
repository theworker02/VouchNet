/**
 * Sends organization claim invites to a list of emails, from the command line.
 * Usage:
 *   DATABASE_URL=... GMAIL_USER=... GMAIL_APP_PASSWORD=... \
 *   node apps/web/scripts/send-org-claim-invites.mjs <inviter-user-id> <slug:email> [<slug:email> ...]
 *
 * inviter-user-id must be a site ADMIN or an existing OWNER/ADMIN member of each org.
 * This is intentionally disabled unless ORGANIZATION_OUTREACH_APPROVED=true is supplied for a
 * specific, human-approved recipient batch. It cannot be used as an automatic campaign sender.
 * EMAIL_FROM overrides the sender; falls back to "VouchNet <GMAIL_USER>".
 * Resend (RESEND_API_KEY + EMAIL_FROM) is used when Gmail credentials are absent.
 */
import { createHash, randomBytes } from 'node:crypto';
import postgres from 'postgres';
import nodemailer from 'nodemailer';

const [, , inviterUserId, ...pairs] = process.argv;
if (inviterUserId === undefined || pairs.length === 0) {
  console.error('usage: send-org-claim-invites.mjs <inviter-user-id> <slug:email> [...]');
  process.exit(1);
}
if (process.env.ORGANIZATION_OUTREACH_APPROVED !== 'true') {
  console.error(
    'Set ORGANIZATION_OUTREACH_APPROVED=true only for an explicitly approved recipient batch.',
  );
  process.exit(1);
}
const appUrl = (process.env.APP_URL ?? 'https://vouchnet.dev').replace(/\/$/, '');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_APP_PASSWORD;
const resendKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM ?? (gmailUser ? `VouchNet <${gmailUser}>` : undefined);
if (emailFrom === undefined || (gmailUser === undefined && resendKey === undefined)) {
  console.error('Set GMAIL_USER+GMAIL_APP_PASSWORD or RESEND_API_KEY, plus EMAIL_FROM.');
  process.exit(1);
}
const transport =
  gmailUser === undefined
    ? null
    : nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailPass },
      });

const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function sendMail(to, subject, text, html) {
  if (transport !== null) {
    await transport.sendMail({ from: emailFrom, to, subject, text, html });
    return;
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: emailFrom, to: [to], subject, text, html }),
  });
  if (!r.ok) throw new Error(`resend ${r.status}`);
}

try {
  for (const pair of pairs) {
    const sep = pair.indexOf(':');
    const slug = pair.slice(0, sep);
    const email = pair
      .slice(sep + 1)
      .trim()
      .toLowerCase();
    const org = (
      await sql`SELECT id,name,website_url FROM organizations WHERE slug=${slug} AND deleted_at IS NULL`
    )[0];
    if (org === undefined) {
      console.log(`${slug}: organization not found — skipped`);
      continue;
    }
    const allowed = (
      await sql`SELECT EXISTS (
        SELECT 1 FROM organization_members m
        WHERE m.organization_id=${org.id} AND m.user_id=${inviterUserId}
          AND m.status='ACTIVE' AND m.role IN ('OWNER','ADMIN')
      ) OR EXISTS (SELECT 1 FROM users u WHERE u.id=${inviterUserId} AND u.role='ADMIN') AS ok`
    )[0].ok;
    if (!allowed) {
      console.log(`${slug}: inviter not authorized — skipped`);
      continue;
    }
    const organizationHost = new URL(org.website_url).hostname.toLowerCase().replace(/^www\./, '');
    const recipientDomain = email.slice(email.lastIndexOf('@') + 1);
    if (!(
      recipientDomain === organizationHost || recipientDomain.endsWith(`.${organizationHost}`)
    )) {
      console.log(`${slug}: recipient must use the organization website domain — skipped`);
      continue;
    }
    const token = randomBytes(24).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await sql.begin(async (tx) => {
      await tx`UPDATE organization_claim_invites SET status='REVOKED'
        WHERE organization_id=${org.id} AND status='PENDING' AND email_normalized=${email}`;
      await tx`INSERT INTO organization_claim_invites
        (organization_id,email_normalized,token_hash,invited_by,expires_at)
        VALUES (${org.id},${email},${tokenHash},${inviterUserId},now() + interval '7 days')`;
    });
    const claimUrl = `${appUrl}/claim/${token}`;
    await sendMail(
      email,
      `${org.name}: claim your organization profile on VouchNet`,
      `You've been invited to claim the ${org.name} organization profile on VouchNet.\n\nClaim it here: ${claimUrl}\n\nThe link expires in 7 days. Sign in (or create an account) with this email address to complete the claim.`,
      `<p>You've been invited to claim the <strong>${esc(org.name)}</strong> organization profile on VouchNet.</p><p><a href="${claimUrl}">Claim ${esc(org.name)}</a></p><p>The link expires in 7 days. Sign in (or create an account) with this email address to complete the claim.</p>`,
    );
    console.log(`${slug}: invite sent to ${email}`);
  }
} finally {
  await sql.end({ timeout: 1 });
}
