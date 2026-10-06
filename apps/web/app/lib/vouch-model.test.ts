import { describe, expect, it } from 'vitest';
import {
  canPerformVouchAction,
  canViewVouch,
  computeVerificationLevel,
  evaluateVouchEligibility,
  isReciprocalPattern,
  normalizeSkills,
  provenanceSignals,
  vouchInputSchema,
  vouchLimits,
  type VouchEligibilityFacts,
} from './vouch-model';

const facts: VouchEligibilityFacts = {
  authorId: 'a',
  recipientId: 'b',
  authorActive: true,
  authorEmailVerified: true,
  recipientAvailable: true,
  blocked: false,
  connected: true,
  sharedContext: false,
  contextRejected: false,
  existingLiveVouch: false,
  vouchesLastDay: 0,
  vouchesLastThirtyDays: 0,
};

const validInput = {
  relationship: 'COLLABORATOR',
  workedTogetherYear: 2025,
  skills: ['Rust', ' rust ', 'Technical   Writing'],
  statement: 'Maya rewrote our sync engine and documented every tradeoff for the team.',
};

describe('vouch validation', () => {
  it('requires context: relationship, year, skills, and a written statement', () => {
    const parsed = vouchInputSchema.parse(validInput);
    expect(parsed.skills).toEqual(['Rust', 'Technical Writing']);
    expect(parsed.visibility).toBe('PUBLIC');
    expect(parsed.contextType).toBe('NONE');
    expect(() => vouchInputSchema.parse({ ...validInput, statement: 'Great!' })).toThrow();
    expect(() => vouchInputSchema.parse({ ...validInput, skills: [] })).toThrow();
    expect(() => vouchInputSchema.parse({ ...validInput, relationship: 'FRIEND' })).toThrow();
    expect(() =>
      vouchInputSchema.parse({
        ...validInput,
        workedTogetherYear: new Date().getUTCFullYear() + 1,
      }),
    ).toThrow();
  });

  it('rejects context types without a context and unknown fields', () => {
    expect(() => vouchInputSchema.parse({ ...validInput, contextType: 'PROJECT' })).toThrow();
    expect(() => vouchInputSchema.parse({ ...validInput, trustScore: 100 })).toThrow();
  });

  it('normalizes and bounds skills', () => {
    const skills = normalizeSkills([
      'a',
      'Go',
      'go',
      'Rust',
      'UI/UX',
      'Docs',
      'SQL',
      'APIs',
      'Extra',
    ]);
    expect(skills).toEqual(['Go', 'Rust', 'UI/UX', 'Docs', 'SQL', 'APIs']);
    expect(skills.length).toBe(vouchLimits.maxSkills);
  });
});

describe('vouch anti-abuse rules', () => {
  it('allows a connected, verified member', () => {
    expect(evaluateVouchEligibility(facts)).toEqual({ allowed: true });
  });

  it.each([
    [{ recipientId: 'a' }, 'CANNOT_VOUCH_FOR_SELF'],
    [{ authorActive: false }, 'ACCOUNT_NOT_ELIGIBLE'],
    [{ authorEmailVerified: false }, 'EMAIL_VERIFICATION_REQUIRED'],
    [{ recipientAvailable: false }, 'PROFILE_UNAVAILABLE'],
    [{ blocked: true }, 'BLOCKED_RELATIONSHIP'],
    [{ contextRejected: true }, 'CONTEXT_NOT_SHARED'],
    [{ connected: false }, 'RELATIONSHIP_REQUIRED'],
    [{ existingLiveVouch: true }, 'ALREADY_VOUCHED'],
    [{ vouchesLastDay: vouchLimits.perDay }, 'VOUCH_RATE_LIMITED'],
    [{ vouchesLastThirtyDays: vouchLimits.perThirtyDays }, 'VOUCH_RATE_LIMITED'],
  ] as const)('denies %o with %s', (override, code) => {
    expect(evaluateVouchEligibility({ ...facts, ...override })).toEqual({ allowed: false, code });
  });

  it('accepts a shared project as the working relationship when not connected', () => {
    expect(evaluateVouchEligibility({ ...facts, connected: false, sharedContext: true })).toEqual({
      allowed: true,
    });
  });

  it('flags mutual vouches created close together as an internal reciprocal signal', () => {
    const at = new Date('2026-10-06T00:00:00Z');
    expect(isReciprocalPattern(at, null)).toBe(false);
    expect(isReciprocalPattern(at, new Date('2026-10-05T00:00:00Z'))).toBe(true);
    expect(isReciprocalPattern(at, new Date('2026-08-01T00:00:00Z'))).toBe(false);
  });

  it('never lets the recipient edit; authors edit/revoke; recipients hide', () => {
    const base = {
      actorId: 'b',
      authorId: 'a',
      recipientId: 'b',
      revoked: false,
      isModerator: false,
    };
    expect(canPerformVouchAction({ ...base, action: 'EDIT' })).toBe(false);
    expect(canPerformVouchAction({ ...base, action: 'REVOKE' })).toBe(false);
    expect(canPerformVouchAction({ ...base, action: 'HIDE' })).toBe(true);
    expect(canPerformVouchAction({ ...base, action: 'REPORT' })).toBe(true);
    expect(canPerformVouchAction({ ...base, actorId: 'a', action: 'EDIT' })).toBe(true);
    expect(canPerformVouchAction({ ...base, actorId: 'a', action: 'HIDE' })).toBe(false);
    expect(canPerformVouchAction({ ...base, actorId: 'a', action: 'EDIT', revoked: true })).toBe(
      false,
    );
    expect(canPerformVouchAction({ ...base, actorId: 'x', action: 'MODERATE' })).toBe(false);
    expect(
      canPerformVouchAction({ ...base, actorId: 'x', action: 'MODERATE', isModerator: true }),
    ).toBe(true);
  });

  it('respects visibility', () => {
    const base = { authorId: 'a', recipientId: 'b' };
    expect(canViewVouch({ ...base, visibility: 'PUBLIC', viewerId: null })).toBe(true);
    expect(canViewVouch({ ...base, visibility: 'MEMBERS', viewerId: null })).toBe(false);
    expect(canViewVouch({ ...base, visibility: 'MEMBERS', viewerId: 'c' })).toBe(true);
    expect(canViewVouch({ ...base, visibility: 'PRIVATE', viewerId: 'c' })).toBe(false);
    expect(canViewVouch({ ...base, visibility: 'PRIVATE', viewerId: 'b' })).toBe(true);
  });
});

describe('verification levels', () => {
  it('derive only from stored evidence', () => {
    expect(computeVerificationLevel([])).toBe('STANDARD');
    expect(computeVerificationLevel([{ type: 'ACCEPTED_CONNECTION', since: '2026-01-01' }])).toBe(
      'STANDARD',
    );
    expect(
      computeVerificationLevel([
        { type: 'SHARED_PROJECT_MEMBERSHIP', projectId: 'p', projectName: 'X' },
      ]),
    ).toBe('CONTEXT_VERIFIED');
    expect(
      computeVerificationLevel([
        { type: 'SHARED_ORGANIZATION_MEMBERSHIP', organizationId: 'o', organizationName: 'O' },
        { type: 'VERIFIED_ORGANIZATION_EMPLOYMENT', organizationId: 'o', organizationName: 'O' },
      ]),
    ).toBe('ORGANIZATION_VERIFIED');
    expect(
      computeVerificationLevel([
        { type: 'SHARED_PROJECT_MEMBERSHIP', projectId: 'p', projectName: 'X' },
        { type: 'SHARED_PROJECT_CONTRIBUTION', projectId: 'p', projectName: 'X' },
      ]),
    ).toBe('CONTRIBUTION_VERIFIED');
  });

  it('lists only verifiable provenance and never a trust score', () => {
    const signals = provenanceSignals({
      evidence: [
        { type: 'AUTHOR_EMAIL_VERIFIED' },
        { type: 'SHARED_PROJECT_CONTRIBUTION', projectId: 'p', projectName: 'Driftwood' },
      ],
      authorMemberSince: new Date('2026-01-15T00:00:00Z'),
      reciprocalFlagged: false,
      now: new Date('2026-10-06T00:00:00Z'),
    });
    expect(signals).toContain('Author has been a member for 9 months');
    expect(signals).toContain('Both contributed build-log entries to Driftwood');
    expect(signals).toContain('No reciprocal-vouch anomaly detected');
    expect(signals.join(' ')).not.toMatch(/score|trustworthy/i);
    const flagged = provenanceSignals({
      evidence: [],
      authorMemberSince: new Date(),
      reciprocalFlagged: true,
    });
    expect(flagged).not.toContain('No reciprocal-vouch anomaly detected');
  });
});
