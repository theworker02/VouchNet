import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import { disableMfa, MfaError } from '../../../../lib/mfa';
import { hasSameOrigin } from '../../../../lib/request-security';

const schema = z.object({ code: z.string().trim().min(6).max(32) }).strict();

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    await disableMfa(actor.userId, schema.parse(await request.json()).code);
    return NextResponse.json({ disabled: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof MfaError ? error.code : 'MFA_DISABLE_FAILED' },
      { status: 400 },
    );
  }
}
