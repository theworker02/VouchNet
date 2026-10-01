export type ApplicationStage =
  'SUBMITTED' | 'AI_VETTED' | 'TECHNICAL_REVIEW' | 'INTERVIEW_SCHEDULED' | 'OFFER' | 'REJECTED';

export const employerApplicationStages = [
  'TECHNICAL_REVIEW',
  'INTERVIEW_SCHEDULED',
  'OFFER',
  'REJECTED',
] as const;
export type EmployerApplicationStage = (typeof employerApplicationStages)[number];

const allowedTransitions: Readonly<Record<ApplicationStage, readonly EmployerApplicationStage[]>> =
  {
    SUBMITTED: ['TECHNICAL_REVIEW', 'REJECTED'],
    AI_VETTED: ['TECHNICAL_REVIEW', 'REJECTED'],
    TECHNICAL_REVIEW: ['INTERVIEW_SCHEDULED', 'OFFER', 'REJECTED'],
    INTERVIEW_SCHEDULED: ['OFFER', 'REJECTED'],
    OFFER: ['REJECTED'],
    REJECTED: [],
  };

/** Deliberately excludes AI_VETTED: a person must not present their manual decision as AI. */
export function canEmployerMoveApplication(
  from: ApplicationStage,
  to: EmployerApplicationStage,
): boolean {
  return allowedTransitions[from].includes(to);
}
