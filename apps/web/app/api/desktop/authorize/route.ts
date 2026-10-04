import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  approveDesktopAuthorization,
  validateDesktopAuthorization,
} from '../../../lib/desktop-auth';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';

const formSchema = z.object({ state: z.string(), codeChallenge: z.string() }).strict();

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const formData = await request.formData();
    const form = formSchema.parse(Object.fromEntries(formData));
    const authorization = validateDesktopAuthorization({
      state: form.state,
      codeChallenge: form.codeChallenge,
    });
    if (authorization === null)
      return NextResponse.json({ error: 'INVALID_DESKTOP_AUTHORIZATION' }, { status: 400 });
    const code = await approveDesktopAuthorization(actor.userId, authorization);
    const callback = new URL('vouchnet://auth/callback');
    callback.searchParams.set('code', code);
    callback.searchParams.set('state', authorization.state);
    return NextResponse.redirect(callback, 303);
  } catch {
    return NextResponse.json({ error: 'DESKTOP_AUTHORIZATION_FAILED' }, { status: 400 });
  }
}
