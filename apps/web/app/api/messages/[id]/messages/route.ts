import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import { hasSameOrigin } from '../../../../lib/request-security';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';
import { sendMessage } from '../../../../lib/messaging';

const paramsSchema = z.object({ id: z.string().uuid() }).strict();
const httpsUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === 'https:', {
    message: 'Attachments must use HTTPS.',
  });
const messageSchema = z
  .object({
    body: z.string().trim().max(12_000).default(''),
    replyToMessageId: z.string().uuid().optional(),
    attachments: z
      .array(
        z.object({
          url: httpsUrl,
          kind: z.enum(['IMAGE', 'LINK', 'DOCUMENT', 'PORTFOLIO']),
          label: z.string().trim().min(1).max(180).nullable().default(null),
          altText: z.string().trim().min(1).max(500).nullable().default(null),
        }),
      )
      .max(4)
      .default([]),
  })
  .strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const { id } = paramsSchema.parse(await context.params);
    const input = messageSchema.parse(await request.json());
    if (input.body.length === 0 && input.attachments.length === 0)
      return NextResponse.json({ error: 'EMPTY_MESSAGE' }, { status: 400 });
    const message = await sendMessage(actor.userId, id, input);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_MESSAGE' : 'MESSAGE_SEND_FAILED' },
      { status: 400 },
    );
  }
}
