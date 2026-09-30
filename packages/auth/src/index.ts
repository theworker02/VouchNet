import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { z } from 'zod';

export const registrationSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(256),
  acceptsTerms: z.literal(true),
  acceptsPrivacy: z.literal(true),
});

export function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase('en-US');
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export interface SecretToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}
export function createSecretToken(ttlMilliseconds: number, now = new Date()): SecretToken {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashOpaqueToken(token),
    expiresAt: new Date(now.getTime() + ttlMilliseconds),
  };
}
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
export function sessionCookie(name: string, token: string, secure: boolean): string {
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? '; Secure' : ''}`;
}

export type RegistrationRiskDecision = 'ALLOW' | 'CHALLENGE' | 'REVIEW' | 'BLOCK';
export interface RegistrationRisk {
  decision: RegistrationRiskDecision;
  reasonCodes: string[];
}
export function evaluateRegistrationRisk(input: {
  recentAttempts: number;
  disposableEmail: boolean;
}): RegistrationRisk {
  if (input.disposableEmail || input.recentAttempts > 20)
    return {
      decision: 'BLOCK',
      reasonCodes: [input.disposableEmail ? 'DISPOSABLE_EMAIL' : 'REGISTRATION_VELOCITY'],
    };
  if (input.recentAttempts > 8)
    return { decision: 'CHALLENGE', reasonCodes: ['REGISTRATION_VELOCITY'] };
  return { decision: 'ALLOW', reasonCodes: [] };
}
