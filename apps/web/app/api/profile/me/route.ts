import { submitToIndexNow } from '../../../lib/indexnow';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest, getProfileSummary, updateOwnProfile } from '../../../lib/identity';
import { setProfileRate } from '../../../lib/profile-services';
import { profileLanguageSet } from '../../../lib/profile-catalog';
import { hasSameOrigin } from '../../../lib/request-security';

const profileUpdateSchema = z.object({
  headline: z
    .string()
    .trim()
    .max(220)
    .transform((value) => value || null),
  location: z
    .string()
    .trim()
    .max(160)
    .transform((value) => value || null),
  about: z
    .string()
    .trim()
    .max(3_000)
    .transform((value) => value || null),
  onboardingStep: z.number().int().min(0).max(10),
  hourlyRateAmount: z.number().nonnegative().max(10_000_000).nullish(),
  hourlyRateCurrency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  hourlyRateVisible: z.boolean().optional(),
  languages: z
    .array(z.string().trim().min(1).max(40))
    .max(12)
    .refine((values) => values.every((value) => profileLanguageSet.has(value)), 'UNKNOWN_LANGUAGE')
    .optional(),
});

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const profile = await getProfileSummary(actor.userId);
  return NextResponse.json({ profile });
}

export async function PATCH(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const input = profileUpdateSchema.parse(await request.json());
    await updateOwnProfile(actor.userId, input);
    if (input.hourlyRateVisible !== undefined || input.hourlyRateAmount !== undefined)
      await setProfileRate(actor.userId, {
        amount: input.hourlyRateAmount ?? null,
        currency: input.hourlyRateCurrency ?? 'USD',
        visible: input.hourlyRateVisible ?? (input.hourlyRateAmount ?? null) !== null,
      });
    const profile = await getProfileSummary(actor.userId);
    if (profile !== null) submitToIndexNow([`/vouch/${profile.slug}`, `/in/${profile.slug}`]);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_PROFILE' : 'PROFILE_UPDATE_FAILED' },
      { status: 400 },
    );
  }
}
