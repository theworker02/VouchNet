import { describe, expect, it } from 'vitest';
import { recommendPeople } from './index.js';
describe('PeopleRecommendationEngine', () => {
  it('excludes blocked, existing, and dismissed candidates', () => {
    const results = recommendPeople([
      {
        userId: 'eligible',
        active: true,
        blocked: false,
        alreadyContact: false,
        alreadyFollowed: false,
        dismissed: false,
        mutualContacts: 1,
        sharedSkills: 0,
        interactionAffinity: 0,
      },
      {
        userId: 'blocked',
        active: true,
        blocked: true,
        alreadyContact: false,
        alreadyFollowed: false,
        dismissed: false,
        mutualContacts: 8,
        sharedSkills: 1,
        interactionAffinity: 1,
      },
      {
        userId: 'dismissed',
        active: true,
        blocked: false,
        alreadyContact: false,
        alreadyFollowed: false,
        dismissed: true,
        mutualContacts: 8,
        sharedSkills: 1,
        interactionAffinity: 1,
      },
    ]);
    expect(results).toEqual([{ userId: 'eligible', score: 10, reasons: ['MUTUAL_CONTACTS'] }]);
  });
});
