export const trustDecisions = [
  'ALLOW',
  'RATE_LIMIT',
  'CHALLENGE',
  'REQUIRE_REAUTH',
  'REQUIRE_HUMAN_APPROVAL',
  'TEMPORARY_RESTRICTION',
  'AUTOMATION_REVOKED',
  'REVIEW_REQUIRED',
  'SUSPENDED',
] as const;
export type TrustDecision = (typeof trustDecisions)[number];
export interface TrustSignal {
  code: string;
  score: number;
}
export interface TrustAssessment {
  decision: TrustDecision;
  reasonCodes: string[];
}

export function evaluateTrust(signals: readonly TrustSignal[]): TrustAssessment {
  const score = signals.reduce((total, signal) => total + signal.score, 0);
  if (score >= 80)
    return { decision: 'REVIEW_REQUIRED', reasonCodes: signals.map((signal) => signal.code) };
  if (score >= 40)
    return {
      decision: 'REQUIRE_HUMAN_APPROVAL',
      reasonCodes: signals.map((signal) => signal.code),
    };
  return { decision: 'ALLOW', reasonCodes: [] };
}
