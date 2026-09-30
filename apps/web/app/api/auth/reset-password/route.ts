import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '../../../lib/identity';
const inputSchema = z.object({ token: z.string().min(20), password: z.string().min(12).max(256) });
export async function POST(request: NextRequest) {
  try {
    const input = inputSchema.parse(await request.json());
    return (await resetPassword(input.token, input.password))
      ? NextResponse.json({ reset: true })
      : NextResponse.json({ error: 'INVALID_OR_EXPIRED_TOKEN' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'INVALID_RESET_REQUEST' }, { status: 400 });
  }
}
