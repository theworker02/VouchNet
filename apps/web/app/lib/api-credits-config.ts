/**
 * The single source of truth for prepaid API and MCP credit pricing.
 *
 * Credits are whole integers. One US dollar buys 1,000 credits, so one credit is a tenth of a
 * cent. Amounts are never represented as floating-point dollars on the server: Stripe charges
 * integer cents and the ledger records integer credits.
 *
 * This module is intentionally free of server-only imports so the settings UI can render the same
 * packages and per-call costs that the server enforces.
 */

export const creditsPerUsd = 1000;

/** Integer credits granted for each integer US cent actually paid. */
export const creditsPerCent = creditsPerUsd / 100;

/** Preset one-time Checkout amounts. Stripe receives these as inline USD `price_data`. */
export const creditTopUpPackages = [
  { id: 'usd_5', amountCents: 500 },
  { id: 'usd_10', amountCents: 1000 },
  { id: 'usd_25', amountCents: 2500 },
  { id: 'usd_50', amountCents: 5000 },
] as const;

export type CreditTopUpPackageId = (typeof creditTopUpPackages)[number]['id'];

/**
 * Credits spent by each metered public API or MCP operation. A call is charged only when it
 * succeeds; see docs/API_CREDITS.md.
 */
export const apiCallCosts = {
  /** POST /api/oauth/token and /api/v1/oauth/token (authorization-code exchange). */
  'oauth.token': 1,
  /** GET /api/oauth/userinfo. */
  'oauth.userinfo': 1,
  /** GET /api/v1/oauth/applicant-data and its /api/v1/oauth/candidate-profile alias. */
  'v1.applicant_data': 2,
  /** Reserved for each MCP tool call once the MCP gateway transport ships. */
  'mcp.tool_call': 1,
} as const satisfies Record<string, number>;

export type ApiOperation = keyof typeof apiCallCosts;

export const apiOperationLabels: Record<ApiOperation, string> = {
  'oauth.token': 'Token exchange',
  'oauth.userinfo': 'User info',
  'v1.applicant_data': 'Applicant data',
  'mcp.tool_call': 'MCP tool call',
};

export function creditsForAmountCents(amountCents: number): number {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0)
    throw new RangeError('INVALID_AMOUNT');
  return amountCents * creditsPerCent;
}

export function findCreditTopUpPackage(id: unknown) {
  return creditTopUpPackages.find((item) => item.id === id) ?? null;
}

export function costForOperation(operation: ApiOperation): number {
  return apiCallCosts[operation];
}
