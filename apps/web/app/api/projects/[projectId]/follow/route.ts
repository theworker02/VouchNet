import { NextRequest, NextResponse } from 'next/server';
import { guardedWrite, uuidParam } from '../../../../lib/build-route';
import { setProjectFollow } from '../../../../lib/projects';

type Context = { params: Promise<{ projectId: string }> };

async function handle(request: NextRequest, context: Context, follow: boolean) {
  return guardedWrite(request, 'PROJECT_FOLLOW_FAILED', async (actor) => {
    const projectId = uuidParam.parse((await context.params).projectId);
    return NextResponse.json(await setProjectFollow(actor.userId, projectId, follow));
  });
}

export async function POST(request: NextRequest, context: Context) {
  return handle(request, context, true);
}

export async function DELETE(request: NextRequest, context: Context) {
  return handle(request, context, false);
}
