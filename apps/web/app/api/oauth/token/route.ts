import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  exchangeAuthorizationCode,
  hasValidPkceVerifier,
  ApplyOAuthError,
} from '../../../lib/apply-oauth';
import { InsufficientCreditsError } from '../../../lib/api-credits-ledger';
import { insufficientCreditsResponse } from '../../../lib/api-credits-response';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';
import { strictFormDataRecord } from '../../../lib/validation/strict-form-data';

export const runtime = 'nodejs';

function basicCredentials(value: string | null): { clientId: string; clientSecret: string } | null {
  if (value === null || !value.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(value.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    return separator < 1
      ? null
      : { clientId: decoded.slice(0, separator), clientSecret: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

const tokenRequestSchema = z
  .object({
    grant_type: z.literal('authorization_code'),
    client_id: z.string().trim().min(3).max(256).optional(),
    client_secret: z.string().min(32).max(512).optional(),
    code: z.string().min(20).max(512),
    redirect_uri: z.string().min(1).max(2048),
    code_verifier: z.string().min(43).max(128),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, 'auth');
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const input = tokenRequestSchema.parse(
      strictFormDataRecord(await request.formData(), [
        'grant_type',
        'client_id',
        'client_secret',
        'code',
        'redirect_uri',
        'code_verifier',
      ]),
    );
    const credentials = basicCredentials(request.headers.get('authorization'));
    if (
      credentials !== null &&
      ((input.client_id !== undefined && input.client_id !== credentials.clientId) ||
        (input.client_secret !== undefined && input.client_secret !== credentials.clientSecret))
    )
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    const clientId = credentials?.clientId ?? input.client_id ?? '';
    const clientSecret = credentials?.clientSecret ?? input.client_secret ?? '';
    if (!hasValidPkceVerifier(input.code_verifier))
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    const token = await exchangeAuthorizationCode({
      clientId,
      clientSecret,
      code: input.code,
      redirectUri: input.redirect_uri,
      codeVerifier: input.code_verifier,
    });
    return NextResponse.json(
      {
        access_token: token.accessToken,
        token_type: 'Bearer',
        expires_in: token.expiresIn,
        scope: token.scopes.join(' '),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof InsufficientCreditsError)
      return insufficientCreditsResponse(error, request.url);
    const code =
      error instanceof ApplyOAuthError && error.code === 'INVALID_REQUEST'
        ? 'invalid_request'
        : 'invalid_grant';
    return NextResponse.json(
      { error: code },
      { status: 400, headers: { 'cache-control': 'no-store' } },
    );
  }
}
