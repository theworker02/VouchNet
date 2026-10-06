import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Developer Access (a recurring subscription for unmetered API/MCP use) has been retired. API and
 * MCP calls are paid with prepaid credits purchased through /api/billing/credits/checkout.
 */
export function POST() {
  return NextResponse.json(
    { error: 'DEVELOPER_ACCESS_RETIRED', replacement: '/api/billing/credits/checkout' },
    { status: 410 },
  );
}
