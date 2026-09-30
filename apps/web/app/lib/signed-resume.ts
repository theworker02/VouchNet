import { createHmac, timingSafeEqual } from 'node:crypto';

type ResumeCapability = { userId: string; mediaId: string; expiresAt: number };

function secret(): string {
  const value = process.env.RESUME_SIGNING_SECRET;
  if (value === undefined || value.length < 32) throw new Error('RESUME_SIGNING_UNAVAILABLE');
  return value;
}

function signature(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function generateSignedResumeUrl(userId: string, mediaId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
  const payload = Buffer.from(JSON.stringify({ userId, mediaId, expiresAt })).toString('base64url');
  const token = `${payload}.${signature(payload)}`;
  return `${process.env.APP_URL ?? 'http://localhost:3002'}/api/v1/resumes/download?token=${encodeURIComponent(token)}`;
}

export function verifySignedResumeToken(value: string | null): ResumeCapability | null {
  if (value === null) return null;
  const [payload, received, ...extra] = value.split('.');
  if (payload === undefined || received === undefined || extra.length > 0) return null;
  const expected = signature(payload);
  if (
    Buffer.byteLength(received) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  )
    return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as ResumeCapability;
    return typeof parsed.userId === 'string' &&
      typeof parsed.mediaId === 'string' &&
      typeof parsed.expiresAt === 'number' &&
      parsed.expiresAt > Math.floor(Date.now() / 1000)
      ? parsed
      : null;
  } catch {
    return null;
  }
}
