import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import type { NextRequest } from 'next/server';
import { logger } from '@nexus/observability';

export const rateLimitTiers = {
  auth: { maxRequests: 5, windowSeconds: 60 },
  generalApi: { maxRequests: 100, windowSeconds: 60 },
  socialWrite: { maxRequests: 20, windowSeconds: 60 },
} as const;

export type RateLimitTier = keyof typeof rateLimitTiers;
export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; unavailable?: false }
  | { allowed: false; retryAfterSeconds: number; unavailable: true };

type RedisConnection = ReturnType<typeof createClient>;

let connection: Promise<RedisConnection> | null = null;

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function requestIp(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

function subjectKey(request: NextRequest, actorId: string | null): string {
  // Store only a one-way digest. This pairs an actor (when present) with coarse request continuity
  // without retaining raw IP addresses or a fingerprinting identifier.
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  return hash(`${actorId ?? 'anonymous'}:${requestIp(request)}:${userAgent.slice(0, 512)}`);
}

async function redis(): Promise<RedisConnection> {
  if (connection !== null) return connection;
  const url = process.env.REDIS_URL;
  if (url === undefined) throw new Error('REDIS_UNAVAILABLE');
  const client = createClient({
    url,
    socket: {
      // A rate-limiter dependency must never leave an authentication request waiting until the
      // hosting edge emits a gateway timeout. Production remains fail-closed after this bound.
      connectTimeout: 5_000,
      reconnectStrategy: false,
    },
  });
  client.on('error', () => {
    connection = null;
    logger.error({ operation: 'rate_limit_redis', outcome: 'failure', errorCode: 'REDIS_ERROR' });
  });
  connection = (async () => {
    await client.connect();
    return client;
  })();
  const activeConnection = connection;
  try {
    return await activeConnection;
  } catch (error) {
    connection = null;
    throw error;
  }
}

const slidingWindowScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local cutoff = now - window
redis.call('ZREMRANGEBYSCORE', key, 0, cutoff)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry = window
  if oldest[2] then retry = math.max(1, window - (now - tonumber(oldest[2]))) end
  return {0, count, retry}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window + 1000)
return {1, count + 1, 0}
`;

function parseRedisDecision(value: unknown): { allowed: boolean; retryAfterMilliseconds: number } {
  if (!Array.isArray(value) || value.length !== 3 || typeof value[0] !== 'number')
    throw new Error('RATE_LIMIT_RESPONSE_INVALID');
  return {
    allowed: value[0] === 1,
    retryAfterMilliseconds: typeof value[2] === 'number' ? Math.max(value[2], 0) : 0,
  };
}

export async function enforceRateLimit(
  request: NextRequest,
  tier: RateLimitTier,
  actorId: string | null = null,
): Promise<RateLimitDecision> {
  const policy = rateLimitTiers[tier];
  const windowMilliseconds = policy.windowSeconds * 1000;
  const key = `vouchnet:rate-limit:${tier}:${subjectKey(request, actorId)}`;
  try {
    const raw = await (
      await redis()
    ).sendCommand([
      'EVAL',
      slidingWindowScript,
      '1',
      key,
      String(Date.now()),
      String(windowMilliseconds),
      String(policy.maxRequests),
      randomUUID(),
    ]);
    const decision = parseRedisDecision(raw);
    return decision.allowed
      ? { allowed: true }
      : { allowed: false, retryAfterSeconds: Math.ceil(decision.retryAfterMilliseconds / 1000) };
  } catch {
    logger.error({
      operation: 'rate_limit_enforcement',
      outcome: 'failure',
      errorCode: 'RATE_LIMIT_UNAVAILABLE',
    });
    // Local development and isolated unit tests remain usable without a Redis process. Production
    // mutations fail closed rather than quietly losing abuse protection.
    return process.env.NEXUS_ENV === 'production'
      ? { allowed: false, retryAfterSeconds: 60, unavailable: true }
      : { allowed: true };
  }
}
