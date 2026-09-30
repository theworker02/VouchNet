import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../lib/identity';
import { hasSameOrigin } from '../../lib/request-security';
import { getUserSettings, saveUserSettings } from '../../lib/settings';

const channel = z.object({ inApp: z.boolean(), email: z.boolean(), push: z.boolean() });
const settingsSchema = z.object({
  preferences: z.object({
    theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']),
    reducedMotion: z.boolean(),
    codeFont: z.enum(['FIRA_CODE', 'JETBRAINS_MONO']),
    language: z.string().min(2).max(16),
    timezone: z.string().min(1).max(64),
  }),
  privacy: z.object({
    profileVisibility: z.enum(['PUBLIC', 'MEMBERS', 'CONNECTIONS', 'PRIVATE']),
    searchIndexing: z.boolean(),
    activeStatus: z.boolean(),
    connectionVisibility: z.enum(['ONLY_ME', 'CONNECTIONS', 'PUBLIC']),
    aiTrainingAllowed: z.boolean(),
  }),
  notifications: z.object({
    frequency: z.enum(['REAL_TIME', 'DAILY_DIGEST', 'PAUSED']),
    channels: z.object({
      DIRECT_MESSAGES: channel,
      PEER_ENDORSEMENTS: channel,
      MENTIONS: channel,
      JOB_MATCHES: channel,
      SYSTEM_UPDATES: channel,
    }),
  }),
});
export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  return NextResponse.json({ settings: await getUserSettings(actor.userId) });
}
export async function PUT(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const settings = settingsSchema.parse(await request.json());
    await saveUserSettings(actor.userId, settings);
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_SETTINGS' : 'SETTINGS_UPDATE_FAILED' },
      { status: 400 },
    );
  }
}
