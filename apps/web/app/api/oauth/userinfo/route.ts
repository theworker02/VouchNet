import { NextRequest, NextResponse } from 'next/server';
import { ApplyOAuthError, profileForAccessToken } from '../../../lib/apply-oauth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (token.length === 0) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  try {
    return NextResponse.json(await profileForAccessToken(token), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof ApplyOAuthError ? 'invalid_token' : 'server_error' },
      { status: error instanceof ApplyOAuthError ? 401 : 503 },
    );
  }
}
