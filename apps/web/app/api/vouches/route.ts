import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardedWrite } from '../../lib/build-route';
import { vouchInputSchema } from '../../lib/vouch-model';
import { createWorkVouch } from '../../lib/work-vouches';

const recipientSchema = z.object({ recipientId: z.string().uuid() }).passthrough();

export async function POST(request: NextRequest) {
  return guardedWrite(request, 'VOUCH_FAILED', async (actor) => {
    const { recipientId, ...rest } = recipientSchema.parse(await request.json());
    const vouch = await createWorkVouch(actor.userId, recipientId, vouchInputSchema.parse(rest));
    return NextResponse.json({ vouch }, { status: 201 });
  });
}
