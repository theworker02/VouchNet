import { NextRequest, NextResponse } from 'next/server';
import { guardedWrite } from '../../../lib/build-route';
import { setProfileIntent } from '../../../lib/build-discovery';
import { profileIntentSchema } from '../../../lib/profile-intent';

/** Sets or clears the signed-in member's current intent. Members can only change their own. */
export async function PUT(request: NextRequest) {
  return guardedWrite(request, 'PROFILE_INTENT_UPDATE_FAILED', async (actor) => {
    const { intent } = profileIntentSchema.parse(await request.json());
    return NextResponse.json({ intent: await setProfileIntent(actor.userId, intent) });
  });
}
