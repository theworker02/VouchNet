import { describe, expect, it } from 'vitest';
import { canEmployerMoveApplication } from './application-stages';

describe('canEmployerMoveApplication', () => {
  it('allows the human hiring pipeline to progress forward', () => {
    expect(canEmployerMoveApplication('SUBMITTED', 'TECHNICAL_REVIEW')).toBe(true);
    expect(canEmployerMoveApplication('TECHNICAL_REVIEW', 'INTERVIEW_SCHEDULED')).toBe(true);
    expect(canEmployerMoveApplication('INTERVIEW_SCHEDULED', 'OFFER')).toBe(true);
  });

  it('rejects rewinds and manual claims of AI vetting', () => {
    expect(canEmployerMoveApplication('SUBMITTED', 'OFFER')).toBe(false);
    expect(canEmployerMoveApplication('OFFER', 'TECHNICAL_REVIEW')).toBe(false);
    expect(canEmployerMoveApplication('REJECTED', 'TECHNICAL_REVIEW')).toBe(false);
  });
});
