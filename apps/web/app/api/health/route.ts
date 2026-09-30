import { NextResponse } from 'next/server';
import { logger } from '@nexus/observability';

export function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  logger.info({ operation: 'health.check', outcome: 'success', requestId });
  return NextResponse.json(
    { status: 'ok', requestId },
    { headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } },
  );
}
