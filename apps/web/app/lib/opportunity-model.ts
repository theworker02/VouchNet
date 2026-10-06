import { z } from 'zod';

export const opportunityTypes = [
  'REQUEST_FOR_SOFTWARE',
  'JOB',
  'CONTRACT',
  'OPEN_SOURCE',
  'RFP',
  'GRANT',
  'BOUNTY',
  'RESEARCH',
  'COFOUNDER',
  'VOLUNTEER',
  'HACKATHON',
] as const;
export type OpportunityType = (typeof opportunityTypes)[number];

export const opportunityTypeLabels: Record<OpportunityType, string> = {
  REQUEST_FOR_SOFTWARE: 'Request for software',
  JOB: 'Job',
  CONTRACT: 'Contract',
  OPEN_SOURCE: 'Open-source work',
  RFP: 'RFP',
  GRANT: 'Grant',
  BOUNTY: 'Bounty',
  RESEARCH: 'Research collaboration',
  COFOUNDER: 'Looking for a cofounder',
  VOLUNTEER: 'Volunteer',
  HACKATHON: 'Hackathon',
};

export const opportunityStatuses = ['OPEN', 'CLOSED', 'FILLED', 'WITHDRAWN'] as const;
export type OpportunityStatus = (typeof opportunityStatuses)[number];

export const proposalStatuses = [
  'SUBMITTED',
  'SHORTLISTED',
  'DECLINED',
  'ACCEPTED',
  'WITHDRAWN',
] as const;
export type ProposalStatus = (typeof proposalStatuses)[number];

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  SUBMITTED: 'Submitted',
  SHORTLISTED: 'Shortlisted',
  DECLINED: 'Declined',
  ACCEPTED: 'Accepted',
  WITHDRAWN: 'Withdrawn',
};

const money = z.number().int().min(0).max(100_000_000);

export const opportunityInputSchema = z
  .object({
    type: z.enum(opportunityTypes),
    title: z.string().trim().min(6).max(120),
    summary: z.string().trim().min(20).max(280),
    description: z.string().trim().min(40).max(8000),
    lookingFor: z.string().trim().min(3).max(400),
    budgetMin: money.nullable().default(null),
    budgetMax: money.nullable().default(null),
    budgetCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/)
      .default('USD'),
    deadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .default(null),
    location: z.string().trim().max(120).nullable().default(null),
    remote: z.boolean().default(true),
    proposalsOpen: z.boolean().default(true),
    projectId: z.string().uuid().nullable().default(null),
    tags: z
      .array(z.string().trim().min(1).max(40))
      .max(10)
      .default([])
      .transform((tags) => [...new Set(tags.map((tag) => tag.toLowerCase()))]),
  })
  .strict()
  .refine(
    (value) =>
      value.budgetMin === null || value.budgetMax === null || value.budgetMax >= value.budgetMin,
    { message: 'The maximum budget must be at least the minimum.', path: ['budgetMax'] },
  );
export type OpportunityInput = z.infer<typeof opportunityInputSchema>;

export const proposalInputSchema = z
  .object({
    message: z.string().trim().min(80).max(4000),
    proposedBudget: money.nullable().default(null),
    timeline: z.string().trim().max(200).nullable().default(null),
    portfolioUrl: z
      .string()
      .trim()
      .url()
      .max(500)
      .refine((value) => value.startsWith('https://'), 'Use an https:// link.')
      .nullable()
      .default(null),
    projectId: z.string().uuid().nullable().default(null),
  })
  .strict();
export type ProposalInput = z.infer<typeof proposalInputSchema>;

export const opportunityLimits = { postsPerDay: 5, proposalsPerDay: 15 } as const;

export function isPastDeadline(deadline: string | null, now = new Date()): boolean {
  if (deadline === null) return false;
  return deadline < now.toISOString().slice(0, 10);
}

export function evaluateProposal(input: {
  actorId: string;
  posterId: string;
  status: OpportunityStatus;
  proposalsOpen: boolean;
  deadline: string | null;
  alreadyProposed: boolean;
  blocked: boolean;
  proposalsToday: number;
  now?: Date;
}): { allowed: true } | { allowed: false; code: string } {
  if (input.actorId === input.posterId) return { allowed: false, code: 'CANNOT_PROPOSE_TO_OWN' };
  if (input.blocked) return { allowed: false, code: 'BLOCKED_RELATIONSHIP' };
  if (input.status !== 'OPEN') return { allowed: false, code: 'OPPORTUNITY_CLOSED' };
  if (!input.proposalsOpen) return { allowed: false, code: 'PROPOSALS_CLOSED' };
  if (isPastDeadline(input.deadline, input.now)) return { allowed: false, code: 'DEADLINE_PASSED' };
  if (input.alreadyProposed) return { allowed: false, code: 'ALREADY_PROPOSED' };
  if (input.proposalsToday >= opportunityLimits.proposalsPerDay)
    return { allowed: false, code: 'PROPOSAL_RATE_LIMITED' };
  return { allowed: true };
}

export type ProposalAction = 'SHORTLIST' | 'DECLINE' | 'ACCEPT' | 'WITHDRAW';

export function nextProposalStatus(input: {
  action: ProposalAction;
  current: ProposalStatus;
  actorIsPoster: boolean;
  actorIsProposer: boolean;
}): ProposalStatus | null {
  const { action, current } = input;
  const live = current === 'SUBMITTED' || current === 'SHORTLISTED';
  if (action === 'WITHDRAW') return input.actorIsProposer && live ? 'WITHDRAWN' : null;
  if (!input.actorIsPoster || !live) return null;
  if (action === 'SHORTLIST') return current === 'SUBMITTED' ? 'SHORTLISTED' : null;
  if (action === 'DECLINE') return 'DECLINED';
  return 'ACCEPTED';
}

export function formatBudget(
  min: number | null,
  max: number | null,
  currency: string,
): string | null {
  const format = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  if (min === null && max === null) return null;
  if (min !== null && max !== null)
    return min === max ? format(min) : `${format(min)} – ${format(max)}`;
  if (min !== null) return `From ${format(min)}`;
  return `Up to ${format(max as number)}`;
}
