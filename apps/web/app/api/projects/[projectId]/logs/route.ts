import { NextRequest, NextResponse } from 'next/server';
import { guardedWrite, uuidParam } from '../../../../lib/build-route';
import { buildLogSchema } from '../../../../lib/project-model';
import { addBuildLog } from '../../../../lib/projects';

type Context = { params: Promise<{ projectId: string }> };

export async function POST(request: NextRequest, context: Context) {
  return guardedWrite(request, 'BUILD_LOG_FAILED', async (actor) => {
    const projectId = uuidParam.parse((await context.params).projectId);
    const result = await addBuildLog(
      actor.userId,
      projectId,
      buildLogSchema.parse(await request.json()),
    );
    return NextResponse.json(result, { status: 201 });
  });
}
