import { NextRequest, NextResponse } from 'next/server';
import { guardedWrite, uuidParam } from '../../../../lib/build-route';
import { contributorInviteSchema } from '../../../../lib/project-model';
import { inviteContributor } from '../../../../lib/projects';

type Context = { params: Promise<{ projectId: string }> };

export async function POST(request: NextRequest, context: Context) {
  return guardedWrite(request, 'CONTRIBUTOR_INVITE_FAILED', async (actor) => {
    const projectId = uuidParam.parse((await context.params).projectId);
    const result = await inviteContributor(
      actor.userId,
      projectId,
      contributorInviteSchema.parse(await request.json()),
    );
    return NextResponse.json(result, { status: 201 });
  });
}
