import { NextResponse } from 'next/server';
import { publicUrl } from './app-url';
import type { InsufficientCreditsError } from './api-credits-ledger';

/**
 * Machine-readable refusal for a metered API or MCP call. The action has not been performed and
 * nothing has been charged.
 */
export function insufficientCreditsResponse(
  error: InsufficientCreditsError,
  requestUrl: string,
): NextResponse {
  return NextResponse.json(
    {
      error: 'INSUFFICIENT_CREDITS',
      error_description:
        'The developer account that owns this client has insufficient prepaid API credits. Add credits in VouchNet settings and retry.',
      required_credits: error.requiredCredits,
      balance_credits: error.balanceCredits,
      top_up_url: publicUrl('/settings/developers', requestUrl).toString(),
    },
    { status: 402, headers: { 'cache-control': 'no-store' } },
  );
}
