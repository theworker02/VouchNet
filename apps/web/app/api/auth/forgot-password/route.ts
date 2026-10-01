import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { beginPasswordReset } from '../../../lib/identity';
import { sendPasswordResetEmail } from '../../../lib/email';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';
const inputSchema = z.object({ email: z.string().email() }).strict();
export async function POST(request: NextRequest) {
  const generic = { status: 'If the account exists, reset instructions are being processed.' };
  try {
    if (!hasSameOrigin(request)) return NextResponse.json(generic, { status: 403 });
    const rateLimit = await enforceRateLimit(request, 'auth');
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const data = inputSchema.parse(await request.json());
    const token = await beginPasswordReset(data.email);
    if (token !== null && process.env.RESEND_API_KEY !== undefined)
      await sendPasswordResetEmail({ email: data.email, token });
    return process.env.NEXUS_ENV !== 'production' && token !== null
      ? NextResponse.json({ ...generic, developmentResetToken: token })
      : NextResponse.json(generic);
  } catch {
    return NextResponse.json(generic);
  }
}
