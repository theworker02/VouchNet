import { NextRequest, NextResponse } from 'next/server';
import { clearSession, logout } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
export async function POST(request: NextRequest) {
  try {
    if (!hasSameOrigin(request))
      return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
    await logout(request);
    return clearSession(NextResponse.redirect(new URL('/login', request.url), 303));
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
