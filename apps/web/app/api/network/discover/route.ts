import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../lib/identity';
import { discoverPeople, saveRecommendationFeedback } from '../../../lib/discovery';
import { z } from 'zod';
import { hasSameOrigin } from '../../../lib/request-security';
const feedbackSchema = z.object({
  candidateId: z.string().uuid(),
  feedback: z.enum(['DISMISSED', 'NOT_INTERESTED', 'ALREADY_KNOW', 'DO_NOT_SUGGEST']),
});
export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    return NextResponse.json({ recommendations: await discoverPeople(actor.userId) });
  } catch {
    return NextResponse.json({ error: 'DISCOVERY_UNAVAILABLE' }, { status: 503 });
  }
}
export async function POST(request: NextRequest) {
  try {
    if (!hasSameOrigin(request))
      return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const body = feedbackSchema.parse(await request.json());
    await saveRecommendationFeedback(actor.userId, body.candidateId, body.feedback);
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: 'INVALID_FEEDBACK' }, { status: 400 });
  }
}
