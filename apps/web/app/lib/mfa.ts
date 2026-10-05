import 'server-only';

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { createSecretToken, hashOpaqueToken } from '@nexus/auth';
import { createSqlClient } from '@nexus/db';

const issuer = 'VouchNet';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const enrollmentLifetimeMs = 15 * 60 * 1000;
const loginChallengeLifetimeMs = 10 * 60 * 1000;

export class MfaError extends Error {
  constructor(
    readonly code:
      'MFA_UNAVAILABLE' | 'MFA_ALREADY_ENABLED' | 'MFA_NOT_ENROLLED' | 'MFA_CODE_INVALID',
  ) {
    super(code);
  }
}

function sql() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new MfaError('MFA_UNAVAILABLE');
  return createSqlClient(url);
}

function encryptionKey() {
  const value = process.env.MFA_ENCRYPTION_KEY ?? process.env.SESSION_SECRET;
  if (value === undefined || value.length < 32) throw new MfaError('MFA_UNAVAILABLE');
  return createHash('sha256').update(value).digest();
}

function base32Encode(bytes: Buffer) {
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(buffer << (5 - bits)) & 31];
  return output;
}

function base32Decode(value: string) {
  let buffer = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const character of value.replace(/=|\s/g, '').toUpperCase()) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new MfaError('MFA_CODE_INVALID');
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function protect(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64url'),
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
  };
}

function reveal(value: { secret_ciphertext: string; secret_iv: string; secret_tag: string }) {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(value.secret_iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(value.secret_tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(value.secret_ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function counterFor(now = Date.now()) {
  return Math.floor(now / 1000 / 30);
}
function codeFor(secret: string, counter: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 15;
  const byteAt = (index: number) => digest[index] ?? 0;
  const value =
    ((byteAt(offset) & 127) << 24) |
    (byteAt(offset + 1) << 16) |
    (byteAt(offset + 2) << 8) |
    byteAt(offset + 3);
  return (value % 1_000_000).toString().padStart(6, '0');
}

function matchingCounter(secret: string, code: string) {
  if (!/^\d{6}$/.test(code)) return null;
  const current = counterFor();
  for (const counter of [current - 1, current, current + 1])
    if (codeFor(secret, counter) === code) return counter;
  return null;
}

function recoveryCodes() {
  return Array.from(
    { length: 10 },
    () =>
      randomBytes(5)
        .toString('hex')
        .toUpperCase()
        .match(/.{1,5}/g)
        ?.join('-') ?? '',
  );
}

export async function getMfaStatus(userId: string) {
  const client = sql();
  try {
    const rows = await client<
      { enrolled_at: Date | null }[]
    >`SELECT enrolled_at FROM mfa_totp_credentials WHERE user_id=${userId} AND disabled_at IS NULL`;
    return { enabled: rows[0]?.enrolled_at !== null && rows[0] !== undefined };
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function beginMfaEnrollment(userId: string) {
  const client = sql();
  const secret = base32Encode(randomBytes(20));
  const encrypted = protect(secret);
  try {
    const emails = await client<
      { email_normalized: string }[]
    >`SELECT email_normalized FROM user_emails WHERE user_id=${userId} AND is_primary=true`;
    const email = emails[0]?.email_normalized;
    if (email === undefined) throw new MfaError('MFA_UNAVAILABLE');
    const existing = await client<
      { enrolled_at: Date | null }[]
    >`SELECT enrolled_at FROM mfa_totp_credentials WHERE user_id=${userId} AND disabled_at IS NULL`;
    if (existing[0]?.enrolled_at !== null && existing[0] !== undefined)
      throw new MfaError('MFA_ALREADY_ENABLED');
    await client`INSERT INTO mfa_totp_credentials (user_id,secret_ciphertext,secret_iv,secret_tag,created_at,updated_at,enrolled_at,disabled_at,last_used_counter)
      VALUES (${userId},${encrypted.ciphertext},${encrypted.iv},${encrypted.tag},now(),now(),NULL,NULL,-1)
      ON CONFLICT (user_id) DO UPDATE SET secret_ciphertext=EXCLUDED.secret_ciphertext,secret_iv=EXCLUDED.secret_iv,secret_tag=EXCLUDED.secret_tag,enrolled_at=NULL,disabled_at=NULL,last_used_counter=-1,updated_at=now()`;
    const label = `${issuer}:${email}`;
    return {
      manualKey: secret,
      otpauthUri: `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`,
      expiresAt: new Date(Date.now() + enrollmentLifetimeMs).toISOString(),
    };
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function confirmMfaEnrollment(userId: string, code: string) {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const rows = await transaction<
        {
          secret_ciphertext: string;
          secret_iv: string;
          secret_tag: string;
          created_at: Date;
          enrolled_at: Date | null;
        }[]
      >`SELECT secret_ciphertext,secret_iv,secret_tag,created_at,enrolled_at FROM mfa_totp_credentials WHERE user_id=${userId} AND disabled_at IS NULL FOR UPDATE`;
      const credential = rows[0];
      if (
        credential === undefined ||
        credential.enrolled_at !== null ||
        Date.now() - credential.created_at.getTime() > enrollmentLifetimeMs
      )
        throw new MfaError('MFA_NOT_ENROLLED');
      if (matchingCounter(reveal(credential), code) === null)
        throw new MfaError('MFA_CODE_INVALID');
      const codes = recoveryCodes();
      await transaction`UPDATE mfa_totp_credentials SET enrolled_at=now(),updated_at=now() WHERE user_id=${userId}`;
      await transaction`DELETE FROM mfa_backup_codes WHERE user_id=${userId}`;
      for (const recoveryCode of codes)
        await transaction`INSERT INTO mfa_backup_codes (user_id,code_hash) VALUES (${userId},${hashOpaqueToken(recoveryCode)})`;
      return { recoveryCodes: codes };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function verifyMfaCode(userId: string, input: string) {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const credentialRows = await transaction<
        {
          secret_ciphertext: string;
          secret_iv: string;
          secret_tag: string;
          last_used_counter: number;
        }[]
      >`SELECT secret_ciphertext,secret_iv,secret_tag,last_used_counter FROM mfa_totp_credentials WHERE user_id=${userId} AND enrolled_at IS NOT NULL AND disabled_at IS NULL FOR UPDATE`;
      const credential = credentialRows[0];
      if (credential === undefined) return false;
      const counter = matchingCounter(reveal(credential), input.replace(/\s/g, ''));
      if (counter !== null && counter > credential.last_used_counter) {
        await transaction`UPDATE mfa_totp_credentials SET last_used_counter=${counter},updated_at=now() WHERE user_id=${userId}`;
        return true;
      }
      const backup = await transaction<
        { id: string }[]
      >`UPDATE mfa_backup_codes SET used_at=now() WHERE user_id=${userId} AND code_hash=${hashOpaqueToken(input.trim().toUpperCase())} AND used_at IS NULL RETURNING id`;
      return backup[0] !== undefined;
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function disableMfa(userId: string, code: string) {
  if (!(await verifyMfaCode(userId, code))) throw new MfaError('MFA_CODE_INVALID');
  const client = sql();
  try {
    await client`UPDATE mfa_totp_credentials SET disabled_at=now(),updated_at=now() WHERE user_id=${userId}`;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function beginMfaLoginChallenge(userId: string) {
  const client = sql();
  const token = createSecretToken(loginChallengeLifetimeMs);
  try {
    await client`UPDATE mfa_login_challenges SET used_at=now() WHERE user_id=${userId} AND used_at IS NULL`;
    await client`INSERT INTO mfa_login_challenges (user_id,token_hash,expires_at) VALUES (${userId},${token.tokenHash},${token.expiresAt})`;
    return token.token;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function completeMfaLoginChallenge(token: string, code: string) {
  const client = sql();
  try {
    const challenges = await client<
      { id: string; user_id: string }[]
    >`SELECT id,user_id FROM mfa_login_challenges WHERE token_hash=${hashOpaqueToken(token)} AND used_at IS NULL AND expires_at>now()`;
    const challenge = challenges[0];
    if (challenge === undefined || !(await verifyMfaCode(challenge.user_id, code))) return null;
    const consumed = await client<
      { id: string }[]
    >`UPDATE mfa_login_challenges SET used_at=now() WHERE id=${challenge.id} AND used_at IS NULL RETURNING id`;
    return consumed[0] === undefined ? null : { userId: challenge.user_id };
  } finally {
    await client.end({ timeout: 1 });
  }
}

export function mfaChallengeCookie(token: string, secure: boolean) {
  return `nexus_mfa=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=600${secure ? '; Secure' : ''}`;
}
export function clearMfaChallengeCookie() {
  return 'nexus_mfa=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';
}
