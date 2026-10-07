/**
 * Restrictive company-domain comparison for the self-service claim path. Domain matches are an
 * eligibility signal only; a VouchNet administrator still makes the ownership decision.
 */
export function organizationDomain(websiteUrl: string): string {
  const hostname = new URL(websiteUrl).hostname.toLowerCase();
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
}

export function emailDomain(email: string): string {
  const separator = email.lastIndexOf('@');
  return separator < 1 ? '' : email.slice(separator + 1).toLowerCase();
}

export function emailControlsOrganizationDomain(
  verifiedEmail: string,
  websiteUrl: string,
): boolean {
  const expected = organizationDomain(websiteUrl);
  const actual = emailDomain(verifiedEmail);
  // A dedicated corporate subdomain is permitted; a lookalike suffix (example.com.attacker) is not.
  return actual === expected || actual.endsWith(`.${expected}`);
}
