import { NextRequest } from 'next/server';

/** Cookie-authenticated browser mutations must originate from this VouchNet origin. Dedicated
 * machine credentials will use a separate gateway and never inherit this browser session path. */
export function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const configuredAppUrl = process.env.APP_URL?.trim();
  let expectedOrigin = request.nextUrl.origin;
  if (configuredAppUrl !== undefined && configuredAppUrl.length > 0) {
    try {
      expectedOrigin = new URL(configuredAppUrl).origin;
    } catch {
      // A malformed deployment setting must fail closed rather than silently trusting a request.
      return false;
    }
  }
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite !== null && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;
  return origin !== null && origin === expectedOrigin;
}
