import type { NextResponse } from 'next/server';
import { NextResponse as Response } from 'next/server';
import { rateLimitTiers, type RateLimitDecision, type RateLimitTier } from './rate-limit';

/** LinkedIn-style rate-limit headers for third-party API responses. */
export function rateLimitHeaders(tier: RateLimitTier): Record<string, string> {
  const policy = rateLimitTiers[tier];
  return {
    'X-RateLimit-Limit': String(policy.maxRequests),
    'X-RateLimit-Policy': `${policy.maxRequests};w=${policy.windowSeconds}`,
  };
}

export function rateLimitResponse(
  decision: Exclude<RateLimitDecision, { allowed: true }>,
  tier: RateLimitTier = 'generalApi',
): NextResponse {
  const code = decision.unavailable ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED';
  return Response.json(
    { success: false, error: { code, retryAfterSeconds: decision.retryAfterSeconds } },
    {
      status: decision.unavailable ? 503 : 429,
      headers: {
        'Retry-After': String(decision.retryAfterSeconds),
        ...rateLimitHeaders(tier),
      },
    },
  );
}
