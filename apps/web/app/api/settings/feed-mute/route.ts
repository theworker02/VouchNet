import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { getUserSettings, saveUserSettings } from '../../../lib/settings';
import { hasVouchNetPlus } from '../../../lib/subscription';

const feedMuteSchema = z.object({
  keywords: z
    .array(z.string().trim().min(2).max(64))
    .max(15)
    .transform((values) => [...new Set(values.map((value) => value.toLocaleLowerCase()))]),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const isPlus = await hasVouchNetPlus(actor.userId);
    const settings = await getUserSettings(actor.userId);
    return NextResponse.json({
      isPlus,
      keywords: isPlus ? settings.preferences.feedMuteKeywords : [],
    });
  } catch {
    return NextResponse.json({ error: 'FEED_CONTROLS_UNAVAILABLE' }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    if (!(await hasVouchNetPlus(actor.userId)))
      return NextResponse.json({ error: 'PLUS_REQUIRED' }, { status: 403 });
    const input = feedMuteSchema.parse(await request.json());
    const settings = await getUserSettings(actor.userId);
    const updated = {
      ...settings,
      preferences: { ...settings.preferences, feedMuteKeywords: input.keywords },
    };
    await saveUserSettings(actor.userId, updated);
    return NextResponse.json({ keywords: input.keywords });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof z.ZodError ? 'INVALID_FEED_CONTROLS' : 'FEED_CONTROLS_UNAVAILABLE',
      },
      { status: error instanceof z.ZodError ? 400 : 503 },
    );
  }
}
