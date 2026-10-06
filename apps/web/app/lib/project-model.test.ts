import { describe, expect, it } from 'vitest';
import {
  canFollowProject,
  evaluateContributorInvite,
  nextContributorStatus,
  normalizeProjectStatus,
  projectInputSchema,
  projectLimits,
} from './project-model';

describe('project statuses', () => {
  it('normalizes legacy statuses', () => {
    expect(normalizeProjectStatus('ACTIVE')).toBe('ACTIVE_DEVELOPMENT');
    expect(normalizeProjectStatus('SHIPPED')).toBe('LAUNCHED');
    expect(normalizeProjectStatus('MAINTAINED')).toBe('MAINTAINED');
    expect(normalizeProjectStatus('unknown')).toBe('IDEA');
  });

  it('validates project input including looking-for roles', () => {
    const parsed = projectInputSchema.parse({
      name: 'Driftwood',
      summary: 'Local-first notes engine',
      description: 'Keeps documentation next to code.',
      status: 'SHIPPED',
      lookingFor: ['TESTERS', 'TESTERS', 'DESIGNERS'],
      tags: ['Rust', 'rust'],
    });
    expect(parsed.status).toBe('LAUNCHED');
    expect(parsed.lookingFor).toEqual(['TESTERS', 'DESIGNERS']);
    expect(parsed.tags).toEqual(['rust']);
    expect(() =>
      projectInputSchema.parse({ ...parsed, status: 'IDEA', lookingFor: ['INVESTORS'] }),
    ).toThrow();
  });
});

describe('project follows', () => {
  const base = { actorId: 'u', ownerId: 'o', projectVisible: true, blocked: false };
  it('allows members to follow visible projects', () => {
    expect(canFollowProject(base)).toEqual({ allowed: true });
  });
  it('refuses owners, hidden projects, and blocked relationships', () => {
    expect(canFollowProject({ ...base, actorId: 'o' })).toEqual({
      allowed: false,
      code: 'OWNER_CANNOT_FOLLOW',
    });
    expect(canFollowProject({ ...base, projectVisible: false })).toEqual({
      allowed: false,
      code: 'PROJECT_UNAVAILABLE',
    });
    expect(canFollowProject({ ...base, blocked: true })).toEqual({
      allowed: false,
      code: 'BLOCKED_RELATIONSHIP',
    });
  });
});

describe('contributor invitations', () => {
  const now = new Date('2026-10-06T00:00:00Z');
  const base = {
    actorId: 'o',
    ownerId: 'o',
    inviteeId: 'c',
    inviteeActive: true,
    blocked: false,
    existing: null,
    acceptedCount: 0,
    pendingCount: 0,
    now,
  };
  it('lets only the owner invite an active, unblocked member', () => {
    expect(evaluateContributorInvite(base)).toEqual({ allowed: true, reinvite: false });
    expect(evaluateContributorInvite({ ...base, actorId: 'c' })).toMatchObject({
      code: 'OWNER_REQUIRED',
    });
    expect(evaluateContributorInvite({ ...base, inviteeId: 'o' })).toMatchObject({
      code: 'CANNOT_INVITE_OWNER',
    });
    expect(evaluateContributorInvite({ ...base, inviteeId: null })).toMatchObject({
      code: 'PROFILE_UNAVAILABLE',
    });
    expect(evaluateContributorInvite({ ...base, blocked: true })).toMatchObject({
      code: 'BLOCKED_RELATIONSHIP',
    });
  });
  it('prevents duplicate and spammy invitations', () => {
    expect(
      evaluateContributorInvite({ ...base, existing: { status: 'INVITED', respondedAt: null } }),
    ).toMatchObject({ code: 'ALREADY_INVITED' });
    expect(
      evaluateContributorInvite({ ...base, existing: { status: 'ACCEPTED', respondedAt: now } }),
    ).toMatchObject({ code: 'ALREADY_CONTRIBUTOR' });
    expect(
      evaluateContributorInvite({
        ...base,
        existing: { status: 'DECLINED', respondedAt: new Date('2026-10-01T00:00:00Z') },
      }),
    ).toMatchObject({ code: 'RECENTLY_DECLINED' });
    expect(
      evaluateContributorInvite({
        ...base,
        existing: { status: 'DECLINED', respondedAt: new Date('2026-09-01T00:00:00Z') },
      }),
    ).toEqual({ allowed: true, reinvite: true });
    expect(
      evaluateContributorInvite({ ...base, pendingCount: projectLimits.maxPendingInvites }),
    ).toMatchObject({ code: 'PENDING_INVITE_LIMIT' });
    expect(
      evaluateContributorInvite({ ...base, acceptedCount: projectLimits.maxContributors }),
    ).toMatchObject({ code: 'CONTRIBUTOR_LIMIT' });
  });
  it('follows the invite → accept/decline → leave/remove lifecycle', () => {
    const invitee = { actorIsOwner: false, actorIsContributor: true };
    const owner = { actorIsOwner: true, actorIsContributor: false };
    expect(nextContributorStatus({ ...invitee, action: 'ACCEPT', current: 'INVITED' })).toBe(
      'ACCEPTED',
    );
    expect(nextContributorStatus({ ...invitee, action: 'DECLINE', current: 'INVITED' })).toBe(
      'DECLINED',
    );
    expect(nextContributorStatus({ ...invitee, action: 'LEAVE', current: 'ACCEPTED' })).toBe(
      'LEFT',
    );
    expect(nextContributorStatus({ ...owner, action: 'REMOVE', current: 'ACCEPTED' })).toBe(
      'REMOVED',
    );
    expect(nextContributorStatus({ ...owner, action: 'ACCEPT', current: 'INVITED' })).toBeNull();
    expect(nextContributorStatus({ ...invitee, action: 'REMOVE', current: 'ACCEPTED' })).toBeNull();
    expect(nextContributorStatus({ ...invitee, action: 'ACCEPT', current: 'DECLINED' })).toBeNull();
  });
});
