import { NextRequest, NextResponse } from 'next/server';
import { applyProviderResult, verificationProvider } from '../../../lib/identity-verification';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (signature === null) return NextResponse.json({ error: 'MISSING_SIGNATURE' }, { status: 400 });
  const result = verificationProvider().parseWebhook(await request.text(), signature);
  if (result === null) return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 400 });
  try {
    await applyProviderResult(result);
    return NextResponse.json({ received: true });
  } catch {
    // Retryable failure: signed redelivery replays into an idempotent update keyed on the
    // provider session id.
    return NextResponse.json({ error: 'WEBHOOK_PROCESSING_FAILED' }, { status: 503 });
  }
}
