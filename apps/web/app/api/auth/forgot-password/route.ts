import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { beginPasswordReset } from '../../../lib/identity';
import { sendPasswordResetEmail } from '../../../lib/email';
const inputSchema = z.object({ email: z.string().email() });
export async function POST(request: NextRequest) {
  const generic = { status: 'If the account exists, reset instructions are being processed.' };
  try {
    const data = inputSchema.parse(await request.json());
    const token = await beginPasswordReset(data.email);
    if (token !== null && process.env.RESEND_API_KEY !== undefined)
      await sendPasswordResetEmail({ email: data.email, token });
    return process.env.NEXUS_ENV !== 'production' && token !== null
      ? NextResponse.json({ ...generic, developmentResetToken: token })
      : NextResponse.json(generic);
  } catch {
    return NextResponse.json(generic);
  }
}
