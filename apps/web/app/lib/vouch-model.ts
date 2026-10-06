import { z } from 'zod';

/**
 * Pure vouch vocabulary and policy. Database adapters (work-vouches.ts) gather facts; these
 * functions decide. Keeping the rules here makes the anti-abuse behavior testable without SQL.
 */
export const vouchRelationships = [
  'COLLABORATOR',
  'CLIENT',
  'COWORKER',
  'OPEN_SOURCE',
  'MANAGER',
  'OTHER',
] as const;
export type VouchRelationship = (typeof vouchRelationships)[number];

export const relationshipLabels: Record<VouchRelationship, string> = {
  COLLABORATOR: 'Collaborator',
  CLIENT: 'Client',
  COWORKER: 'Coworker',
  OPEN_SOURCE: 'Open Source',
  MANAGER: 'Manager',
  OTHER: 'Other',
};

export const vouchVisibilities = ['PUBLIC', 'MEMBERS', 'PRIVATE'] as const;
export type VouchVisibility = (typeof vouchVisibilities)[number];
export const visibilityLabels: Record<VouchVisibility, string> = {
  PUBLIC: 'Public',
  MEMBERS: 'Members only',
  PRIVATE: 'Only the recipient',
};

export const verificationLevels = [
  'STANDARD',
  'CONTEXT_VERIFIED',
  'ORGANIZATION_VERIFIED',
  'CONTRIBUTION_VERIFIED',
] as const;
export type VerificationLevel = (typeof verificationLevels)[number];

export const verificationLabels: Record<VerificationLevel, { label: string; detail: string }> = {
  STANDARD: { label: 'Standard', detail: 'Another VouchNet member vouched.' },
  CONTEXT_VERIFIED: {
    label: 'Context Verified',
    detail: 'Tied to a VouchNet project or organization both people belong to.',
  },
  ORGANIZATION_VERIFIED: {
    label: 'Organization Verified',
    detail: 'Supported by verified employment at a domain-verified organization.',
  },
  CONTRIBUTION_VERIFIED: {
    label: 'Contribution Verified',
    detail: 'Both people have attributable contributions to the same VouchNet project.',
  },
};

/** Evidence is stored with the vouch so its level can be recomputed and explained later. */
export type VerificationEvidence =
  | { type: 'AUTHOR_EMAIL_VERIFIED' }
  | { type: 'RECIPIENT_EMAIL_VERIFIED' }
  | { type: 'ACCEPTED_CONNECTION'; since: string }
  | { type: 'SHARED_PROJECT_MEMBERSHIP'; projectId: string; projectName: string }
  | { type: 'SHARED_PROJECT_CONTRIBUTION'; projectId: string; projectName: string }
  | { type: 'SHARED_ORGANIZATION_MEMBERSHIP'; organizationId: string; organizationName: string }
  | {
      type: 'VERIFIED_ORGANIZATION_EMPLOYMENT';
      organizationId: string;
      organizationName: string;
    };

/**
 * Levels describe how much context VouchNet can verify; they are not status. ORGANIZATION_VERIFIED
 * requires domain-verified organizations, which no workflow can produce yet, so in practice it is
 * computable but unreachable until organization DNS verification ships.
 */
export function computeVerificationLevel(
  evidence: readonly VerificationEvidence[],
): VerificationLevel {
  const types = new Set(evidence.map((item) => item.type));
  if (types.has('SHARED_PROJECT_CONTRIBUTION')) return 'CONTRIBUTION_VERIFIED';
  if (types.has('VERIFIED_ORGANIZATION_EMPLOYMENT')) return 'ORGANIZATION_VERIFIED';
  if (types.has('SHARED_PROJECT_MEMBERSHIP') || types.has('SHARED_ORGANIZATION_MEMBERSHIP'))
    return 'CONTEXT_VERIFIED';
  return 'STANDARD';
}

export const vouchLimits = {
  perDay: 5,
  perThirtyDays: 20,
  /** Mutual vouches created this close together are recorded as an internal reciprocal signal. */
  reciprocalWindowHours: 72,
  maxSkills: 6,
  statementMin: 40,
  statementMax: 1200,
} as const;

export function normalizeSkill(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 40);
}

export function normalizeSkills(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of values) {
    const skill = normalizeSkill(raw);
    const key = skill.toLowerCase();
    if (skill.length < 2 || seen.has(key)) continue;
    seen.add(key);
    output.push(skill);
  }
  return output.slice(0, vouchLimits.maxSkills);
}

const currentYear = () => new Date().getUTCFullYear();

export const vouchInputSchema = z
  .object({
    relationship: z.enum(vouchRelationships),
    contextType: z.enum(['NONE', 'PROJECT', 'ORGANIZATION']).default('NONE'),
    contextId: z.string().uuid().nullable().default(null),
    workedTogetherYear: z
      .number()
      .int()
      .min(1970)
      .refine((year) => year <= currentYear(), 'Year cannot be in the future.'),
    skills: z
      .array(z.string().max(60))
      .min(1)
      .max(12)
      .transform(normalizeSkills)
      .refine((skills) => skills.length >= 1, 'Choose at least one skill.'),
    statement: z.string().trim().min(vouchLimits.statementMin).max(vouchLimits.statementMax),
    visibility: z.enum(vouchVisibilities).default('PUBLIC'),
  })
  .strict()
  .refine(
    (value) =>
      (value.contextType === 'NONE' && value.contextId === null) ||
      (value.contextType !== 'NONE' && value.contextId !== null),
    { message: 'Context requires a project or organization.', path: ['contextId'] },
  );
export type VouchInput = z.infer<typeof vouchInputSchema>;

export type VouchEligibilityFacts = {
  authorId: string;
  recipientId: string;
  authorActive: boolean;
  authorEmailVerified: boolean;
  recipientAvailable: boolean;
  blocked: boolean;
  connected: boolean;
  /** True when the chosen context is a project/org both people belong to. */
  sharedContext: boolean;
  /** Context was requested but one of the people is not a member of it. */
  contextRejected: boolean;
  existingLiveVouch: boolean;
  vouchesLastDay: number;
  vouchesLastThirtyDays: number;
};

export type VouchDenial =
  | 'CANNOT_VOUCH_FOR_SELF'
  | 'ACCOUNT_NOT_ELIGIBLE'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'PROFILE_UNAVAILABLE'
  | 'BLOCKED_RELATIONSHIP'
  | 'CONTEXT_NOT_SHARED'
  | 'RELATIONSHIP_REQUIRED'
  | 'ALREADY_VOUCHED'
  | 'VOUCH_RATE_LIMITED';

/**
 * A vouch requires a real working relationship VouchNet can observe: an accepted connection or a
 * project/organization both people belong to. Drive-by vouches from strangers are refused.
 */
export function evaluateVouchEligibility(
  facts: VouchEligibilityFacts,
): { allowed: true } | { allowed: false; code: VouchDenial } {
  if (facts.authorId === facts.recipientId)
    return { allowed: false, code: 'CANNOT_VOUCH_FOR_SELF' };
  if (!facts.authorActive) return { allowed: false, code: 'ACCOUNT_NOT_ELIGIBLE' };
  if (!facts.authorEmailVerified) return { allowed: false, code: 'EMAIL_VERIFICATION_REQUIRED' };
  if (!facts.recipientAvailable) return { allowed: false, code: 'PROFILE_UNAVAILABLE' };
  if (facts.blocked) return { allowed: false, code: 'BLOCKED_RELATIONSHIP' };
  if (facts.contextRejected) return { allowed: false, code: 'CONTEXT_NOT_SHARED' };
  if (!facts.connected && !facts.sharedContext)
    return { allowed: false, code: 'RELATIONSHIP_REQUIRED' };
  if (facts.existingLiveVouch) return { allowed: false, code: 'ALREADY_VOUCHED' };
  if (
    facts.vouchesLastDay >= vouchLimits.perDay ||
    facts.vouchesLastThirtyDays >= vouchLimits.perThirtyDays
  )
    return { allowed: false, code: 'VOUCH_RATE_LIMITED' };
  return { allowed: true };
}

export function isReciprocalPattern(newVouchAt: Date, reverseVouchCreatedAt: Date | null): boolean {
  if (reverseVouchCreatedAt === null) return false;
  return (
    Math.abs(newVouchAt.getTime() - reverseVouchCreatedAt.getTime()) <=
    vouchLimits.reciprocalWindowHours * 3_600_000
  );
}

export type VouchAction = 'EDIT' | 'REVOKE' | 'HIDE' | 'UNHIDE' | 'REPORT' | 'MODERATE';

/** The recipient can never edit someone else's words; only the author edits or revokes. */
export function canPerformVouchAction(input: {
  action: VouchAction;
  actorId: string;
  authorId: string;
  recipientId: string;
  revoked: boolean;
  isModerator: boolean;
}): boolean {
  const { action, actorId } = input;
  if (action === 'MODERATE') return input.isModerator;
  if (action === 'REPORT') return actorId !== input.authorId;
  if (input.revoked) return false;
  if (action === 'EDIT' || action === 'REVOKE') return actorId === input.authorId;
  return actorId === input.recipientId;
}

/** Who may read a vouch, before recipient hiding and moderation are applied. */
export function canViewVouch(input: {
  visibility: VouchVisibility;
  viewerId: string | null;
  authorId: string;
  recipientId: string;
}): boolean {
  if (input.viewerId === input.authorId || input.viewerId === input.recipientId) return true;
  if (input.visibility === 'PUBLIC') return true;
  if (input.visibility === 'MEMBERS') return input.viewerId !== null;
  return false;
}

/**
 * "Why this vouch is credible" lists only facts VouchNet can verify. It never scores or judges a
 * person's trustworthiness.
 */
export function provenanceSignals(input: {
  evidence: readonly VerificationEvidence[];
  authorMemberSince: Date;
  reciprocalFlagged: boolean;
  now?: Date;
}): string[] {
  const now = input.now ?? new Date();
  const signals: string[] = [];
  const has = (type: VerificationEvidence['type']) =>
    input.evidence.some((item) => item.type === type);
  if (has('AUTHOR_EMAIL_VERIFIED')) signals.push('Author’s email address is verified');
  if (has('RECIPIENT_EMAIL_VERIFIED')) signals.push('Recipient’s email address is verified');
  const months = Math.max(
    0,
    (now.getUTCFullYear() - input.authorMemberSince.getUTCFullYear()) * 12 +
      now.getUTCMonth() -
      input.authorMemberSince.getUTCMonth(),
  );
  signals.push(
    months < 1
      ? 'Author joined VouchNet this month'
      : `Author has been a member for ${months} month${months === 1 ? '' : 's'}`,
  );
  for (const item of input.evidence) {
    if (item.type === 'ACCEPTED_CONNECTION') signals.push('The two accounts are connected');
    if (item.type === 'SHARED_PROJECT_MEMBERSHIP')
      signals.push(`Both are members of ${item.projectName}`);
    if (item.type === 'SHARED_PROJECT_CONTRIBUTION')
      signals.push(`Both contributed build-log entries to ${item.projectName}`);
    if (item.type === 'SHARED_ORGANIZATION_MEMBERSHIP')
      signals.push(`Both belong to ${item.organizationName} on VouchNet`);
    if (item.type === 'VERIFIED_ORGANIZATION_EMPLOYMENT')
      signals.push(`Employment at ${item.organizationName} is verified`);
  }
  if (!input.reciprocalFlagged) signals.push('No reciprocal-vouch anomaly detected');
  return signals;
}
