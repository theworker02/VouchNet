import { NextRequest, NextResponse } from 'next/server';

/**
 * Legacy clients still request this conventional address. Redirecting preserves a real icon
 * response while the root metadata points modern clients at the canonical PNG asset.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/brand/vouchnet-mark.png', request.url), 308);
  response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return response;
}
