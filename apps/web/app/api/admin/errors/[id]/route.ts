import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import { hasSameOrigin } from '../../../../lib/request-security';
import { isAdministrator, updateErrorStatus } from '../../../../lib/telemetry-server';

const statusSchema = z.object({ status: z.enum(['UNRESOLVED', 'TRIAGED', 'RESOLVED', 'IGNORED']) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ success: false, error: { code: 'CSRF_REJECTED' } }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null || !(await isAdministrator(actor.userId))) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_AUTHORIZED' } },
        { status: 403 },
      );
    }
    const input = statusSchema.parse(await request.json());
    const updated = await updateErrorStatus((await context.params).id, input.status);
    return NextResponse.json(
      updated ? { success: true } : { success: false, error: { code: 'NOT_FOUND' } },
      { status: updated ? 200 : 404 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: error instanceof z.ZodError ? 'VALIDATION_ERROR' : 'ERROR_UPDATE_FAILED' },
      },
      { status: error instanceof z.ZodError ? 400 : 503 },
    );
  }
}
