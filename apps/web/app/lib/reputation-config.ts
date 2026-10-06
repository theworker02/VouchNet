/**
 * Participation reputation configuration. Every number that shapes a member's reputation lives
 * here so it can be reviewed, documented (docs/BUILD_IN_PUBLIC.md), and tested in one place.
 *
 * Reputation is earned mainly by participating: publishing posts, commenting on and replying to
 * other people's work, and writing project build-log entries. Vouches only add a bounded bonus.
 */
export const reputationConfig = {
  /** Only activity inside this trailing window counts, keeping the score current and queries bounded. */
  windowDays: 365,
  /** Base points for the first action of each type on a UTC day. */
  actionPoints: { POST: 5, COMMENT: 2, REPLY: 2, BUILD_LOG: 4 },
  /** Maximum points one action type can earn per UTC day. */
  dailyCaps: { POST: 15, COMMENT: 8, REPLY: 8, BUILD_LOG: 12 },
  /** The nth same-type action on a day earns base * sameDayDecay^(n - 1). */
  sameDayDecay: 0.8,
  /** An action within this many seconds of the previous same-type action is considered rapid. */
  rapidRepeatSeconds: 90,
  /** Multiplier applied to rapid repeats, on top of same-day decay. */
  rapidRepeatMultiplier: 0.25,
  vouchBonus: {
    /** Vouches can never add more than this fraction of activity points. */
    maxBonus: 0.15,
    /** Larger values make the bonus approach the cap more slowly (diminishing returns). */
    saturation: 5,
    relationshipWeights: {
      MANAGER: 1,
      COWORKER: 1,
      CLIENT: 0.9,
      COLLABORATOR: 0.9,
      OPEN_SOURCE: 0.9,
      OTHER: 0.6,
    },
    verificationWeights: {
      STANDARD: 1,
      CONTEXT_VERIFIED: 1.15,
      ORGANIZATION_VERIFIED: 1.25,
      CONTRIBUTION_VERIFIED: 1.3,
    },
    /** A voucher's own participation points scale their vouch between floor and 1. */
    credibilityFloor: 0.4,
    credibilityFullAtPoints: 150,
    /** Mutual vouches exchanged within the reciprocal window count at this weight. */
    reciprocalWeight: 0.5,
  },
  levels: [
    { minimum: 0, label: 'Newcomer' },
    { minimum: 25, label: 'Contributor' },
    { minimum: 100, label: 'Builder' },
    { minimum: 300, label: 'Established' },
    { minimum: 700, label: 'Distinguished' },
  ],
} as const;

export type ActivityType = keyof typeof reputationConfig.actionPoints;
