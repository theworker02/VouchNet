import { describe, expect, it } from 'vitest';
import {
  blankToNull,
  canChangeOpportunityStatus,
  evaluateProposal,
  formatBudget,
  isPastDeadline,
  nextProposalStatus,
  opportunityInputSchema,
  parseOpportunityFilters,
  proposalInputSchema,
} from './opportunity-model';

const now = new Date('2026-10-06T12:00:00Z');

describe('opportunity validation', () => {
  it('accepts a request for software with budget range and deadline', () => {
    const parsed = opportunityInputSchema.parse({
      type: 'REQUEST_FOR_SOFTWARE',
      title: 'Offline inventory app for a food bank',
      summary: 'We need a small offline-first app to track donations across three sites.',
      description:
        'Volunteers record donations on tablets that are frequently offline. We need sync that can be trusted.',
      lookingFor: 'A builder with offline-first mobile experience',
      budgetMin: 4000,
      budgetMax: 9000,
      deadline: '2026-11-30',
    });
    expect(parsed.proposalsOpen).toBe(true);
    expect(parsed.budgetCurrency).toBe('USD');
  });

  it('rejects an inverted budget range', () => {
    expect(() =>
      opportunityInputSchema.parse({
        type: 'BOUNTY',
        title: 'Fix the flaky test',
        summary: 'The integration suite fails intermittently on Windows.',
        description:
          'Find and fix the race in the integration test harness that fails about one in ten runs.',
        lookingFor: 'Anyone comfortable with Node',
        budgetMin: 500,
        budgetMax: 100,
      }),
    ).toThrow();
  });

  it('requires a substantive proposal and https portfolio links', () => {
    expect(() => proposalInputSchema.parse({ message: 'I can do it.' })).toThrow();
    expect(() =>
      proposalInputSchema.parse({ message: 'x'.repeat(100), portfolioUrl: 'http://example.com' }),
    ).toThrow();
    expect(proposalInputSchema.parse({ message: 'x'.repeat(100) }).proposedBudget).toBeNull();
  });
});

describe('opportunity proposals', () => {
  const base = {
    actorId: 'builder',
    posterId: 'poster',
    status: 'OPEN' as const,
    proposalsOpen: true,
    deadline: '2026-10-30',
    alreadyProposed: false,
    blocked: false,
    proposalsToday: 0,
    now,
  };
  it('allows a builder to propose to an open opportunity', () => {
    expect(evaluateProposal(base)).toEqual({ allowed: true });
  });
  it.each([
    [{ actorId: 'poster' }, 'CANNOT_PROPOSE_TO_OWN'],
    [{ blocked: true }, 'BLOCKED_RELATIONSHIP'],
    [{ status: 'CLOSED' as const }, 'OPPORTUNITY_CLOSED'],
    [{ proposalsOpen: false }, 'PROPOSALS_CLOSED'],
    [{ deadline: '2026-10-05' }, 'DEADLINE_PASSED'],
    [{ alreadyProposed: true }, 'ALREADY_PROPOSED'],
    [{ proposalsToday: 15 }, 'PROPOSAL_RATE_LIMITED'],
  ])('denies %o with %s', (override, code) => {
    expect(evaluateProposal({ ...base, ...override })).toEqual({ allowed: false, code });
  });
  it('treats the deadline day itself as open', () => {
    expect(isPastDeadline('2026-10-06', now)).toBe(false);
    expect(isPastDeadline(null, now)).toBe(false);
  });
  it('lets the poster review and the proposer withdraw', () => {
    const poster = { actorIsPoster: true, actorIsProposer: false };
    const proposer = { actorIsPoster: false, actorIsProposer: true };
    expect(nextProposalStatus({ ...poster, action: 'SHORTLIST', current: 'SUBMITTED' })).toBe(
      'SHORTLISTED',
    );
    expect(nextProposalStatus({ ...poster, action: 'ACCEPT', current: 'SHORTLISTED' })).toBe(
      'ACCEPTED',
    );
    expect(nextProposalStatus({ ...poster, action: 'DECLINE', current: 'SUBMITTED' })).toBe(
      'DECLINED',
    );
    expect(nextProposalStatus({ ...poster, action: 'WITHDRAW', current: 'SUBMITTED' })).toBeNull();
    expect(nextProposalStatus({ ...proposer, action: 'ACCEPT', current: 'SUBMITTED' })).toBeNull();
    expect(nextProposalStatus({ ...proposer, action: 'WITHDRAW', current: 'SHORTLISTED' })).toBe(
      'WITHDRAWN',
    );
    expect(nextProposalStatus({ ...poster, action: 'ACCEPT', current: 'DECLINED' })).toBeNull();
  });
  it('formats budget ranges', () => {
    expect(formatBudget(4000, 9000, 'USD')).toBe('$4,000 – $9,000');
    expect(formatBudget(null, 500, 'USD')).toBe('Up to $500');
    expect(formatBudget(null, null, 'USD')).toBeNull();
  });
});

describe('opportunity lifecycle and filters', () => {
  it('lets posters close, fill, reopen, and withdraw, but never revive a withdrawal', () => {
    expect(canChangeOpportunityStatus('OPEN', 'CLOSED')).toBe(true);
    expect(canChangeOpportunityStatus('OPEN', 'FILLED')).toBe(true);
    expect(canChangeOpportunityStatus('CLOSED', 'OPEN')).toBe(true);
    expect(canChangeOpportunityStatus('CLOSED', 'WITHDRAWN')).toBe(true);
    expect(canChangeOpportunityStatus('FILLED', 'OPEN')).toBe(false);
    expect(canChangeOpportunityStatus('WITHDRAWN', 'OPEN')).toBe(false);
    expect(canChangeOpportunityStatus('OPEN', 'OPEN')).toBe(false);
  });

  it('ignores unknown filter values instead of failing', () => {
    expect(parseOpportunityFilters({ type: 'GRANT', q: '  rust ', remote: '1' })).toEqual({
      type: 'GRANT',
      q: 'rust',
      remoteOnly: true,
    });
    expect(parseOpportunityFilters({ type: 'DROP TABLE', q: ['', 'x'], remote: 'yes' })).toEqual({
      type: null,
      q: null,
      remoteOnly: false,
    });
  });

  it('treats blank form values as unset', () => {
    expect(blankToNull('  ')).toBeNull();
    expect(blankToNull('USD')).toBe('USD');
    expect(blankToNull(4)).toBe(4);
  });
});
