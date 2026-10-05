import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { attachSession, createUserSession } from '../../../../lib/identity';
import { clearMfaChallengeCookie, completeMfaLoginChallenge } from '../../../../lib/mfa';
import { publicUrl } from '../../../../lib/app-url';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';

const formSchema = z
  .object({ code: z.string().trim().min(6).max(32), next: z.string().optional() })
  .strict();

export async function POST(request: NextRequest) {
  const rateLimit = await enforceRateLimit(request, 'auth');
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  try {
    const input = formSchema.parse(Object.fromEntries(await request.formData()));
    const token = request.cookies.get('nexus_mfa')?.value;
    const completed =
      token === undefined ? null : await completeMfaLoginChallenge(token, input.code);
    if (completed === null)
      return NextResponse.redirect(
        publicUrl(
          `/login/mfa?error=INVALID_CODE&next=${encodeURIComponent(input.next ?? '/home')}`,
          request.url,
        ),
        303,
      );
    const session = await createUserSession(completed.userId);
    const destination =
      input.next?.startsWith('/') && !input.next.startsWith('//') ? input.next : '/home';
    const response = attachSession(
      NextResponse.redirect(publicUrl(destination, request.url), 303),
      session.token,
    );
    response.headers.append('set-cookie', clearMfaChallengeCookie());
    return response;
  } catch {
    return NextResponse.redirect(publicUrl('/login/mfa?error=INVALID_CODE', request.url), 303);
  }
}
