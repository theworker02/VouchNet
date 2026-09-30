import { NextRequest } from 'next/server';
import { POST as exchangeToken } from '../../../oauth/token/route';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return exchangeToken(request);
}
