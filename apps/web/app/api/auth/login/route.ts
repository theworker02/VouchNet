import { NextRequest, NextResponse } from 'next/server';
import { attachSession, login } from '../../../lib/identity';
export async function POST(request: NextRequest) {
  const form = await request.formData();
  try {
    const result = await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
    if (result === null)
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
    return attachSession(NextResponse.redirect(new URL('/home', request.url), 303), result.token);
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
