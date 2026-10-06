import { z } from 'zod';

export const projectStatuses = [
  'IDEA',
  'ACTIVE_DEVELOPMENT',
  'LAUNCHED',
  'MAINTAINED',
  'ARCHIVED',
] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const projectStatusLabels: Record<ProjectStatus, string> = {
  IDEA: 'Idea',
  ACTIVE_DEVELOPMENT: 'Active development',
  LAUNCHED: 'Launched',
  MAINTAINED: 'Maintained',
  ARCHIVED: 'Archived',
};

/** Rows written before Build in Public used ACTIVE and SHIPPED. */
export function normalizeProjectStatus(value: string): ProjectStatus {
  if (value === 'ACTIVE') return 'ACTIVE_DEVELOPMENT';
  if (value === 'SHIPPED') return 'LAUNCHED';
  return (projectStatuses as readonly string[]).includes(value) ? (value as ProjectStatus) : 'IDEA';
}

export const lookingForOptions = [
  'DESIGNERS',
  'TESTERS',
  'CONTRIBUTORS',
  'ENGINEERS',
  'WRITERS',
  'COFOUNDER',
  'EARLY_USERS',
  'FEEDBACK',
  'MAINTAINERS',
  'RESEARCHERS',
] as const;
export type LookingFor = (typeof lookingForOptions)[number];
export const lookingForLabels: Record<LookingFor, string> = {
  DESIGNERS: 'Designers',
  TESTERS: 'Testers',
  CONTRIBUTORS: 'Contributors',
  ENGINEERS: 'Engineers',
  WRITERS: 'Technical writers',
  COFOUNDER: 'A cofounder',
  EARLY_USERS: 'Early users',
  FEEDBACK: 'Feedback',
  MAINTAINERS: 'Maintainers',
  RESEARCHERS: 'Researchers',
};

const optionalHttpsUrl = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((value) => value.startsWith('https://') || value.startsWith('http://'), 'Use a web URL.')
  .optional();

export const projectInputSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    summary: z.string().trim().min(10).max(280),
    description: z.string().trim().min(10).max(12_000),
    status: z
      .enum([...projectStatuses, 'ACTIVE', 'SHIPPED'])
      .transform((value) => normalizeProjectStatus(value)),
    projectUrl: optionalHttpsUrl,
    repositoryUrl: optionalHttpsUrl,
    documentationUrl: optionalHttpsUrl,
    demoUrl: optionalHttpsUrl,
    openSource: z.boolean().default(false),
    lookingFor: z
      .array(z.enum(lookingForOptions))
      .max(8)
      .default([])
      .transform((items) => [...new Set(items)]),
    tags: z
      .array(z.string().trim().min(1).max(40))
      .max(12)
      .transform((tags) => [...new Set(tags.map((tag) => tag.toLowerCase()))]),
  })
  .strict();
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const projectUpdateSchema = projectInputSchema.partial().strict();
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

export const buildLogSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(10).max(4000),
    loggedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

export const contributorInviteSchema = z
  .object({
    profileSlug: z.string().trim().toLowerCase().min(3).max(40),
    role: z.string().trim().min(2).max(60),
  })
  .strict();

export const projectLimits = {
  maxContributors: 50,
  maxPendingInvites: 20,
  declinedReinviteDays: 14,
  buildLogsPerDay: 10,
} as const;

export type ProjectRole = 'OWNER' | 'CONTRIBUTOR' | 'INVITEE' | 'VIEWER';

export function canFollowProject(input: {
  actorId: string;
  ownerId: string;
  projectVisible: boolean;
  blocked: boolean;
}): { allowed: true } | { allowed: false; code: string } {
  if (!input.projectVisible) return { allowed: false, code: 'PROJECT_UNAVAILABLE' };
  if (input.actorId === input.ownerId) return { allowed: false, code: 'OWNER_CANNOT_FOLLOW' };
  if (input.blocked) return { allowed: false, code: 'BLOCKED_RELATIONSHIP' };
  return { allowed: true };
}

export type ContributorStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'REMOVED' | 'LEFT';

export function evaluateContributorInvite(input: {
  actorId: string;
  ownerId: string;
  inviteeId: string | null;
  inviteeActive: boolean;
  blocked: boolean;
  existing: { status: ContributorStatus; respondedAt: Date | null } | null;
  acceptedCount: number;
  pendingCount: number;
  now?: Date;
}): { allowed: true; reinvite: boolean } | { allowed: false; code: string } {
  const now = input.now ?? new Date();
  if (input.actorId !== input.ownerId) return { allowed: false, code: 'OWNER_REQUIRED' };
  if (input.inviteeId === null || !input.inviteeActive)
    return { allowed: false, code: 'PROFILE_UNAVAILABLE' };
  if (input.inviteeId === input.ownerId) return { allowed: false, code: 'CANNOT_INVITE_OWNER' };
  if (input.blocked) return { allowed: false, code: 'BLOCKED_RELATIONSHIP' };
  if (input.acceptedCount >= projectLimits.maxContributors)
    return { allowed: false, code: 'CONTRIBUTOR_LIMIT' };
  if (input.pendingCount >= projectLimits.maxPendingInvites)
    return { allowed: false, code: 'PENDING_INVITE_LIMIT' };
  if (input.existing === null) return { allowed: true, reinvite: false };
  if (input.existing.status === 'INVITED') return { allowed: false, code: 'ALREADY_INVITED' };
  if (input.existing.status === 'ACCEPTED') return { allowed: false, code: 'ALREADY_CONTRIBUTOR' };
  if (
    input.existing.status === 'DECLINED' &&
    input.existing.respondedAt !== null &&
    now.getTime() - input.existing.respondedAt.getTime() <
      projectLimits.declinedReinviteDays * 86_400_000
  )
    return { allowed: false, code: 'RECENTLY_DECLINED' };
  return { allowed: true, reinvite: true };
}

export type ContributorAction = 'ACCEPT' | 'DECLINE' | 'LEAVE' | 'REMOVE';

/** Only the invitee answers an invitation; only the owner removes; contributors may leave. */
export function nextContributorStatus(input: {
  action: ContributorAction;
  current: ContributorStatus;
  actorIsOwner: boolean;
  actorIsContributor: boolean;
}): ContributorStatus | null {
  const { action, current } = input;
  if (action === 'ACCEPT' && input.actorIsContributor && current === 'INVITED') return 'ACCEPTED';
  if (action === 'DECLINE' && input.actorIsContributor && current === 'INVITED') return 'DECLINED';
  if (action === 'LEAVE' && input.actorIsContributor && current === 'ACCEPTED') return 'LEFT';
  if (
    action === 'REMOVE' &&
    input.actorIsOwner &&
    (current === 'ACCEPTED' || current === 'INVITED')
  )
    return 'REMOVED';
  return null;
}
