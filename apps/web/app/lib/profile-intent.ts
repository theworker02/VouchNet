import { z } from 'zod';

/** What a member is open to right now. Shown on their profile and on discovery cards. */
export const profileIntents = [
  'AVAILABLE_FOR_WORK',
  'LOOKING_FOR_COLLABORATORS',
  'HIRING',
  'LOOKING_FOR_FUNDING',
  'JUST_NETWORKING',
] as const;
export type ProfileIntent = (typeof profileIntents)[number];

export const profileIntentLabels: Record<ProfileIntent, string> = {
  AVAILABLE_FOR_WORK: 'Available for work',
  LOOKING_FOR_COLLABORATORS: 'Looking for collaborators',
  HIRING: 'Hiring',
  LOOKING_FOR_FUNDING: 'Looking for funding',
  JUST_NETWORKING: 'Just networking',
};

export const profileIntentSchema = z.object({ intent: z.enum(profileIntents).nullable() }).strict();

export function normalizeProfileIntent(value: unknown): ProfileIntent | null {
  return typeof value === 'string' && (profileIntents as readonly string[]).includes(value)
    ? (value as ProfileIntent)
    : null;
}
