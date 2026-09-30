import { NextRequest, NextResponse } from 'next/server';
import { ApplyOAuthError, profileForAccessToken } from '../../../../lib/apply-oauth';

export const runtime = 'nodejs';

/** Candidate data remains scope-minimized: resumes require an actual protected-download service. */
export async function GET(request: NextRequest) {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (token.length === 0) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  try {
    const profile = await profileForAccessToken(token);
    return NextResponse.json(
      {
        vouch_id: profile.sub,
        personal_info: profile,
        work_experience: [],
        verified_skills: [],
        resume: null,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof ApplyOAuthError ? 'invalid_token' : 'server_error' },
      { status: error instanceof ApplyOAuthError ? 401 : 503 },
    );
  }
}
