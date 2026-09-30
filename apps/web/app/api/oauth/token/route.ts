import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeAuthorizationCode,
  hasValidPkceVerifier,
  ApplyOAuthError,
} from '../../../lib/apply-oauth';

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

export async function POST(request: NextRequest) {
  try {
    const input = await request.formData();
    const credentials = basicCredentials(request.headers.get('authorization'));
    const clientId = credentials?.clientId ?? String(input.get('client_id') ?? '');
    const clientSecret = credentials?.clientSecret ?? String(input.get('client_secret') ?? '');
    const codeVerifier = String(input.get('code_verifier') ?? '');
    if (input.get('grant_type') !== 'authorization_code' || !hasValidPkceVerifier(codeVerifier))
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    const token = await exchangeAuthorizationCode({
      clientId,
      clientSecret,
      code: String(input.get('code') ?? ''),
      redirectUri: String(input.get('redirect_uri') ?? ''),
      codeVerifier,
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
