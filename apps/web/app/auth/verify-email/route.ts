import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail } from '../../lib/identity';
import { publicUrl } from '../../lib/app-url';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (token === null || token.length < 20)
    return NextResponse.redirect(publicUrl('/settings/account?verified=invalid', request.url), 303);
  try {
    const verified = await verifyEmail(token);
    return NextResponse.redirect(
      publicUrl(
        `/settings/account?verified=${verified === null ? 'invalid' : 'true'}`,
        request.url,
      ),
      303,
    );
  } catch {
    return NextResponse.redirect(publicUrl('/settings/account?verified=error', request.url), 303);
  }
}
