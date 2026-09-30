import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail } from '../../../lib/identity';
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  const token = contentType.includes('application/json')
    ? ((await request.json().catch(() => null)) as { token?: string } | null)?.token
    : String((await request.formData()).get('token') ?? '');
  if (typeof token !== 'string' || token.length === 0)
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
  try {
    const verified = await verifyEmail(token);
    if (contentType.includes('application/json')) return NextResponse.json({ verified });
    return verified
      ? NextResponse.redirect(new URL('/login?verified=1', request.url), 303)
      : NextResponse.redirect(new URL('/verify?error=expired', request.url), 303);
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
