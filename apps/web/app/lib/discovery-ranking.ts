/**
 * Honest, explainable discovery ranking. Every score is computed from recorded activity and each
 * ranked item carries the plain-language reasons used to place it. No engagement prediction,
 * no social-graph "people you may know", and no generated content.
 */
export const discoveryConfig = {
  momentumWindowDays: 14,
  momentumHalfLifeDays: 7,
  weights: { follow: 2, buildLog: 3, contributor: 4, opportunity: 1 },
  builderWindowDays: 30,
} as const;

export type MomentumSignal = {
  kind: 'follow' | 'buildLog' | 'contributor' | 'opportunity';
  at: Date;
};

function decay(at: Date, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - at.getTime()) / 86_400_000);
  return 0.5 ** (ageDays / discoveryConfig.momentumHalfLifeDays);
}

/** Recent follows, build-log entries, and new contributors, each decaying with a 7-day half-life. */
export function momentumScore(signals: readonly MomentumSignal[], now = new Date()): number {
  const windowStart = now.getTime() - discoveryConfig.momentumWindowDays * 86_400_000;
  const score = signals
    .filter((signal) => signal.at.getTime() >= windowStart && signal.at.getTime() <= now.getTime())
    .reduce((sum, signal) => sum + discoveryConfig.weights[signal.kind] * decay(signal.at, now), 0);
  return Math.round(score * 100) / 100;
}

export function momentumReasons(signals: readonly MomentumSignal[], now = new Date()): string[] {
  const windowStart = now.getTime() - discoveryConfig.momentumWindowDays * 86_400_000;
  const recent = signals.filter((signal) => signal.at.getTime() >= windowStart);
  const count = (kind: MomentumSignal['kind']) => recent.filter((s) => s.kind === kind).length;
  const reasons: string[] = [];
  const plural = (value: number, singular: string, pluralForm: string) =>
    `${value} ${value === 1 ? singular : pluralForm}`;
  const logs = count('buildLog');
  const follows = count('follow');
  const contributors = count('contributor');
  const opportunities = count('opportunity');
  if (logs > 0) reasons.push(`${plural(logs, 'build-log entry', 'build-log entries')} in 14 days`);
  if (follows > 0) reasons.push(`${plural(follows, 'new follower', 'new followers')} in 14 days`);
  if (contributors > 0)
    reasons.push(`${plural(contributors, 'contributor', 'contributors')} joined in 14 days`);
  if (opportunities > 0)
    reasons.push(`${plural(opportunities, 'new opportunity', 'new opportunities')} posted`);
  return reasons;
}

export type RankedItem<T> = T & { score: number; reasons: string[] };

export function rankByMomentum<T extends { id: string; signals: readonly MomentumSignal[] }>(
  items: readonly T[],
  now = new Date(),
  limit = 6,
): RankedItem<T>[] {
  return items
    .map((item) => ({
      ...item,
      score: momentumScore(item.signals, now),
      reasons: momentumReasons(item.signals, now),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit);
}

export type BuilderCandidate = {
  id: string;
  buildLogs30d: number;
  activeProjects: number;
  acceptedContributions: number;
  reputationScore: number;
  vouchers: number;
};

/**
 * People building interesting things: recent build-log activity matters most, then projects they
 * actively maintain or contribute to. Participation reputation breaks ties; vouches never dominate.
 */
export function builderScore(candidate: BuilderCandidate): number {
  const score =
    Math.min(candidate.buildLogs30d, 10) * 3 +
    Math.min(candidate.activeProjects, 5) * 4 +
    Math.min(candidate.acceptedContributions, 5) * 3 +
    Math.log10(1 + Math.max(0, candidate.reputationScore)) * 2 +
    Math.min(candidate.vouchers, 10) * 0.5;
  return Math.round(score * 100) / 100;
}

export function builderReasons(candidate: BuilderCandidate): string[] {
  const reasons: string[] = [];
  if (candidate.buildLogs30d > 0)
    reasons.push(
      `${candidate.buildLogs30d} build-log ${candidate.buildLogs30d === 1 ? 'entry' : 'entries'} this month`,
    );
  if (candidate.activeProjects > 0)
    reasons.push(
      `${candidate.activeProjects} active project${candidate.activeProjects === 1 ? '' : 's'}`,
    );
  if (candidate.acceptedContributions > 0)
    reasons.push(
      `Contributes to ${candidate.acceptedContributions} project${candidate.acceptedContributions === 1 ? '' : 's'}`,
    );
  if (candidate.vouchers > 0)
    reasons.push(
      `Vouched for by ${candidate.vouchers} ${candidate.vouchers === 1 ? 'person' : 'people'}`,
    );
  return reasons;
}

export function rankBuilders<T extends BuilderCandidate>(
  candidates: readonly T[],
  limit = 6,
): RankedItem<T>[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: builderScore(candidate),
      reasons: builderReasons(candidate),
    }))
    .filter(
      (candidate) =>
        candidate.buildLogs30d + candidate.activeProjects + candidate.acceptedContributions > 0,
    )
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit);
}

export type OpportunityCandidate = {
  id: string;
  createdAt: Date;
  deadline: string | null;
  proposalCount: number;
};

/** Open opportunities: closing soon first (within 14 days), then newest; fewer proposals surface earlier. */
export function opportunityScore(candidate: OpportunityCandidate, now = new Date()): number {
  const ageDays = Math.max(0, (now.getTime() - candidate.createdAt.getTime()) / 86_400_000);
  let score = 10 * 0.5 ** (ageDays / 10);
  if (candidate.deadline !== null) {
    const daysLeft = (Date.parse(`${candidate.deadline}T23:59:59Z`) - now.getTime()) / 86_400_000;
    if (daysLeft < 0) return -1;
    if (daysLeft <= 14) score += 6 * (1 - daysLeft / 14);
  }
  score += candidate.proposalCount === 0 ? 2 : candidate.proposalCount < 5 ? 1 : 0;
  return Math.round(score * 100) / 100;
}

export function opportunityReasons(candidate: OpportunityCandidate, now = new Date()): string[] {
  const reasons: string[] = [];
  const ageDays = Math.floor((now.getTime() - candidate.createdAt.getTime()) / 86_400_000);
  reasons.push(
    ageDays <= 0 ? 'Posted today' : `Posted ${ageDays} day${ageDays === 1 ? '' : 's'} ago`,
  );
  if (candidate.deadline !== null) {
    const daysLeft = Math.ceil(
      (Date.parse(`${candidate.deadline}T23:59:59Z`) - now.getTime()) / 86_400_000,
    );
    if (daysLeft >= 0 && daysLeft <= 14)
      reasons.push(`Closes in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`);
  }
  if (candidate.proposalCount === 0) reasons.push('No proposals yet');
  return reasons;
}

export function rankOpportunities<T extends OpportunityCandidate>(
  candidates: readonly T[],
  now = new Date(),
  limit = 6,
): RankedItem<T>[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: opportunityScore(candidate, now),
      reasons: opportunityReasons(candidate, now),
    }))
    .filter((candidate) => candidate.score >= 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit);
}
