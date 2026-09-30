import { NextRequest } from 'next/server';

/** Cookie-authenticated browser mutations must originate from this VouchNet origin. Dedicated
 * machine credentials will use a separate gateway and never inherit this browser session path. */
export function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return origin !== null && origin === request.nextUrl.origin;
}
