import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { completeDailyStrategyRun, getDailyStrategyGame } from '../../../lib/daily-strategy';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';

const completionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  moves: z.array(z.number().int()).max(64),
  elapsedMs: z.number().finite().min(0).max(1_800_000),
});

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  return NextResponse.json({ game: getDailyStrategyGame() });
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const input = completionSchema.parse(await request.json());
    const run = await completeDailyStrategyRun({ userId: actor.userId, ...input });
    if (run === null) return NextResponse.json({ error: 'UNVERIFIED_SOLUTION' }, { status: 422 });
    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof z.ZodError ? 'INVALID_DAILY_GAME_COMPLETION' : 'DAILY_GAME_FAILED',
      },
      { status: 400 },
    );
  }
}
