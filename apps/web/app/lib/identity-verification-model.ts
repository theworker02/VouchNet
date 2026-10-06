/** Pure mapping kept separate from the server-only module so unit tests stay dependency-free. */

export const identityMethodDocumentSelfie = 'Government ID + selfie match';

export type IdentityVerificationStatus = 'PENDING' | 'REQUIRES_INPUT' | 'VERIFIED' | 'CANCELED';

export function stripeSessionStatus(status: string): IdentityVerificationStatus {
  switch (status) {
    case 'verified':
      return 'VERIFIED';
    case 'canceled':
      return 'CANCELED';
    case 'requires_input':
      return 'REQUIRES_INPUT';
    default:
      return 'PENDING';
  }
}
