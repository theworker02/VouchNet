import { describe, expect, it } from 'vitest';
import { emailControlsOrganizationDomain, organizationDomain } from './organization-claim-policy';
import { organizationClaimRequestSchema } from './organization-claim-schema';

describe('organization self-claim policy', () => {
  it('accepts a verified company email and strips a cosmetic www prefix', () => {
    expect(organizationDomain('https://www.example.com/about')).toBe('example.com');
    expect(emailControlsOrganizationDomain('owner@example.com', 'https://www.example.com')).toBe(
      true,
    );
  });

  it('rejects deceptive suffixes and unrelated public-email domains', () => {
    expect(
      emailControlsOrganizationDomain('owner@example.com.attacker.test', 'https://example.com'),
    ).toBe(false);
    expect(emailControlsOrganizationDomain('owner@personal-mail.test', 'https://example.com')).toBe(
      false,
    );
  });

  it('keeps the relationship request schema strict', () => {
    expect(() =>
      organizationClaimRequestSchema.parse({
        relationship: 'FOUNDER',
        statement: 'I am an authorized founder for this organization.',
        unexpected: 'ownership should not accept undeclared fields',
      }),
    ).toThrow();
  });
});
