import { reputationConfig, type ActivityType } from './reputation-config';
import type { VerificationLevel, VouchRelationship } from './vouch-model';

export type ActivityEvent = {
  id: string;
  type: ActivityType;
  occurredAt: Date;
  /** Comments or replies on the member's own post earn nothing. */
  onOwnContent: boolean;
  /** Deleted, moderated, or explicitly revoked content never earns points. */
  revoked: boolean;
};

export type ReputationVouch = {
  relationship: VouchRelationship;
  verificationLevel: VerificationLevel;
  /** Participation points of the person who wrote the vouch (no vouch bonus, avoiding recursion). */
  authorActivityPoints: number;
  reciprocal: boolean;
};

export type ActivityBreakdown = Record<ActivityType, { count: number; points: number }>;

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Applies per-action points, same-day diminishing returns, rapid-repeat damping, and daily caps.
 * Revoked content and interactions with one's own content are skipped before any counting, so
 * they neither earn points nor consume the day's allowance.
 */
export function computeActivityPoints(
  events: readonly ActivityEvent[],
  now = new Date(),
): { points: number; breakdown: ActivityBreakdown } {
  const windowStart = now.getTime() - reputationConfig.windowDays * 86_400_000;
  const breakdown: ActivityBreakdown = {
    POST: { count: 0, points: 0 },
    COMMENT: { count: 0, points: 0 },
    REPLY: { count: 0, points: 0 },
    BUILD_LOG: { count: 0, points: 0 },
  };
  const eligible = events
    .filter(
      (event) =>
        !event.revoked &&
        !event.onOwnContent &&
        event.occurredAt.getTime() >= windowStart &&
        event.occurredAt.getTime() <= now.getTime(),
    )
    .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  const dayTotals = new Map<string, { count: number; points: number; lastAt: number }>();
  for (const event of eligible) {
    const key = `${event.type}:${utcDay(event.occurredAt)}`;
    const day = dayTotals.get(key) ?? { count: 0, points: 0, lastAt: Number.NEGATIVE_INFINITY };
    let earned =
      reputationConfig.actionPoints[event.type] * reputationConfig.sameDayDecay ** day.count;
    if (event.occurredAt.getTime() - day.lastAt < reputationConfig.rapidRepeatSeconds * 1000)
      earned *= reputationConfig.rapidRepeatMultiplier;
    earned = Math.max(0, Math.min(earned, reputationConfig.dailyCaps[event.type] - day.points));
    dayTotals.set(key, {
      count: day.count + 1,
      points: day.points + earned,
      lastAt: event.occurredAt.getTime(),
    });
    breakdown[event.type].count += 1;
    breakdown[event.type].points += earned;
  }
  for (const type of Object.keys(breakdown) as ActivityType[])
    breakdown[type].points = round(breakdown[type].points);
  const points = round(Object.values(breakdown).reduce((sum, item) => sum + item.points, 0));
  return { points, breakdown };
}

export function vouchWeight(vouch: ReputationVouch): number {
  const config = reputationConfig.vouchBonus;
  const credibility =
    config.credibilityFloor +
    (1 - config.credibilityFloor) *
      Math.min(1, Math.max(0, vouch.authorActivityPoints) / config.credibilityFullAtPoints);
  return (
    config.relationshipWeights[vouch.relationship] *
    config.verificationWeights[vouch.verificationLevel] *
    credibility *
    (vouch.reciprocal ? config.reciprocalWeight : 1)
  );
}

/** Diminishing returns: bonus = maxBonus * (1 - e^(-weight / saturation)), so it never exceeds the cap. */
export function computeVouchBonus(vouches: readonly ReputationVouch[]): number {
  const config = reputationConfig.vouchBonus;
  const weight = vouches.reduce((sum, vouch) => sum + vouchWeight(vouch), 0);
  const bonus = config.maxBonus * (1 - Math.exp(-weight / config.saturation));
  return Math.min(config.maxBonus, round(bonus, 4));
}

export function reputationLevel(score: number): { label: string; next: number | null } {
  const levels = reputationConfig.levels;
  let index = 0;
  for (let position = 0; position < levels.length; position += 1)
    if (score >= (levels[position]?.minimum ?? Number.POSITIVE_INFINITY)) index = position;
  return { label: levels[index]?.label ?? 'Newcomer', next: levels[index + 1]?.minimum ?? null };
}

export type Reputation = {
  score: number;
  activityPoints: number;
  vouchBonus: number;
  level: string;
  nextLevelAt: number | null;
  breakdown: ActivityBreakdown;
};

/** score = activityPoints * (1 + vouchBonus). Without participation, vouches add nothing. */
export function computeReputation(
  events: readonly ActivityEvent[],
  vouches: readonly ReputationVouch[],
  now = new Date(),
): Reputation {
  const activity = computeActivityPoints(events, now);
  const vouchBonus = computeVouchBonus(vouches);
  const score = Math.round(activity.points * (1 + vouchBonus));
  const level = reputationLevel(score);
  return {
    score,
    activityPoints: activity.points,
    vouchBonus,
    level: level.label,
    nextLevelAt: level.next,
    breakdown: activity.breakdown,
  };
}
