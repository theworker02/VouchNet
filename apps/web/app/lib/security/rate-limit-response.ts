import type { NextResponse } from 'next/server';
import { NextResponse as Response } from 'next/server';
import type { RateLimitDecision } from './rate-limit';

export function rateLimitResponse(
  decision: Exclude<RateLimitDecision, { allowed: true }>,
): NextResponse {
  const code = decision.unavailable ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED';
  return Response.json(
    { success: false, error: { code, retryAfterSeconds: decision.retryAfterSeconds } },
    {
      status: decision.unavailable ? 503 : 429,
      headers: { 'Retry-After': String(decision.retryAfterSeconds) },
    },
  );
}
