const errorCopy: Record<string, string> = {
  INVALID_INPUT: 'Check the highlighted fields and try again.',
  POST_RATE_LIMITED: 'You have posted the daily maximum of opportunities. Try again tomorrow.',
  DEADLINE_IN_PAST: 'Choose a deadline that is today or later.',
  PROJECT_NOT_YOURS: 'You can only link projects you own or contribute to.',
  POSTER_REQUIRED: 'Only the person who posted this opportunity can change it.',
  OPPORTUNITY_REMOVED: 'This opportunity was removed by moderation.',
  STATUS_CHANGE_NOT_ALLOWED: 'That status change is not available.',
  OPPORTUNITY_UNAVAILABLE: 'This opportunity is not available.',
  CANNOT_PROPOSE_TO_OWN: 'You posted this opportunity.',
  OPPORTUNITY_CLOSED: 'This opportunity is no longer open.',
  PROPOSALS_CLOSED: 'The poster is not accepting proposals right now.',
  DEADLINE_PASSED: 'The deadline for proposals has passed.',
  ALREADY_PROPOSED: 'You already sent a proposal for this opportunity.',
  PROPOSAL_RATE_LIMITED: 'You have sent the daily maximum of proposals. Try again tomorrow.',
  PROPOSAL_ACTION_NOT_ALLOWED: 'That change is not available for this proposal.',
  PROPOSAL_UNAVAILABLE: 'This proposal is not available.',
  RATE_LIMITED: 'Too many changes in a short time. Wait a moment and try again.',
};

export function opportunityErrorCopy(code: string | null | undefined, fallback: string): string {
  return (code === null || code === undefined ? undefined : errorCopy[code]) ?? fallback;
}

export async function readOpportunityError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return opportunityErrorCopy(body.error, fallback);
  } catch {
    return fallback;
  }
}
