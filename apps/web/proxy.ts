import { NextRequest, NextResponse } from 'next/server';
import { createContentSecurityPolicy } from './app/lib/security/content-security-policy';

/**
 * Next.js 16's request boundary. A fresh nonce and request identifier are injected only by the
 * server so render-time scripts and audit events cannot be influenced by client-supplied values.
 */
export function proxy(request: NextRequest): NextResponse {
  // `/vouch/:username` is the public, canonical profile address. Preserve inbound links to the
  // legacy `/in/:username` shape without allowing two indexable profile URLs to compete.
  const legacyProfile = request.nextUrl.pathname.match(/^\/in\/([^/]+)$/);
  if (legacyProfile !== null) {
    const url = request.nextUrl.clone();
    url.pathname = `/vouch/${legacyProfile[1]}`;
    return NextResponse.redirect(url, 308);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  const contentSecurityPolicy =
    process.env.NODE_ENV === 'production' ? createContentSecurityPolicy(nonce) : null;
  requestHeaders.set('x-vouchnet-csp-nonce', nonce);
  requestHeaders.set('x-request-id', requestId);
  // Next only assigns its framework scripts the nonce when it can see the policy on the incoming
  // request. Setting it on the response alone serves a valid-looking CSP that blocks hydration
  // and silently leaves every Client Component button inert.
  if (contentSecurityPolicy !== null)
    requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // Next's development runtime uses eval for client-side diagnostics and hot updates. Keep the
  // production nonce policy strict, while allowing local client components to hydrate normally.
  if (contentSecurityPolicy !== null)
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  response.headers.set('X-Request-Id', requestId);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
