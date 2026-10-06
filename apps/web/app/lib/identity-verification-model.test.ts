import { describe, expect, it } from 'vitest';
import { identityMethodDocumentSelfie, stripeSessionStatus } from './identity-verification-model';

describe('stripeSessionStatus', () => {
  it('marks a completed document check verified', () => {
    expect(stripeSessionStatus('verified')).toBe('VERIFIED');
  });

  it('maps a declined or abandoned session to terminal states', () => {
    expect(stripeSessionStatus('canceled')).toBe('CANCELED');
    expect(stripeSessionStatus('requires_input')).toBe('REQUIRES_INPUT');
  });

  it('treats processing and unknown states as still pending', () => {
    expect(stripeSessionStatus('processing')).toBe('PENDING');
    expect(stripeSessionStatus('unexpected')).toBe('PENDING');
  });
});

describe('identityMethodDocumentSelfie', () => {
  it('describes the check without exposing document details', () => {
    expect(identityMethodDocumentSelfie).toBe('Government ID + selfie match');
  });
});
