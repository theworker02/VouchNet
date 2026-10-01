import { NextRequest, NextResponse } from 'next/server';
import { createContentSecurityPolicy } from './app/lib/security/content-security-policy';

/**
 * Next.js 16's request boundary. A fresh nonce and request identifier are injected only by the
 * server so render-time scripts and audit events cannot be influenced by client-supplied values.
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-vouchnet-csp-nonce', nonce);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', createContentSecurityPolicy(nonce));
  response.headers.set('X-Request-Id', requestId);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
