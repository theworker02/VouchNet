export const interactionWeights = {
  CONTACT_ACCEPTED: 10,
  MESSAGE: 8,
  POST_COMMENT: 4,
  POST_REACTION: 1,
  FOLLOW: 2,
  PROFILE_VIEW: 0.25,
} as const;
export type RecommendationReason =
  | 'MUTUAL_CONTACTS'
  | 'SHARED_SKILLS'
  | 'SHARED_EDUCATION'
  | 'PROJECT_OVERLAP'
  | 'NETWORK_INTERACTION'
  | 'SHARED_INTERESTS';
export interface PersonCandidate {
  userId: string;
  blocked: boolean;
  active: boolean;
  alreadyContact: boolean;
  alreadyFollowed: boolean;
  dismissed: boolean;
  mutualContacts: number;
  sharedSkills: number;
  interactionAffinity: number;
}
export interface PersonRecommendation {
  userId: string;
  score: number;
  reasons: RecommendationReason[];
}
export function recommendPeople(
  candidates: readonly PersonCandidate[],
  limit = 20,
): PersonRecommendation[] {
  return candidates
    .filter(
      (candidate) =>
        candidate.active && !candidate.blocked && !candidate.alreadyContact && !candidate.dismissed,
    )
    .map((candidate) => {
      const reasons: RecommendationReason[] = [];
      if (candidate.mutualContacts > 0) reasons.push('MUTUAL_CONTACTS');
      if (candidate.sharedSkills > 0) reasons.push('SHARED_SKILLS');
      if (candidate.interactionAffinity > 0) reasons.push('NETWORK_INTERACTION');
      return {
        userId: candidate.userId,
        score:
          candidate.mutualContacts * 10 +
          candidate.sharedSkills * 3 +
          candidate.interactionAffinity,
        reasons,
      };
    })
    .filter((candidate) => candidate.reasons.length > 0)
    .sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId))
    .slice(0, limit);
}
