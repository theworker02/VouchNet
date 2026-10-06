import { NextRequest, NextResponse } from 'next/server';
import { guardedWrite, uuidParam } from '../../../lib/build-route';
import { projectUpdateSchema } from '../../../lib/project-model';
import { updateProject } from '../../../lib/projects';

type Context = { params: Promise<{ projectId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  return guardedWrite(request, 'PROJECT_UPDATE_FAILED', async (actor) => {
    const projectId = uuidParam.parse((await context.params).projectId);
    const project = await updateProject(
      actor.userId,
      projectId,
      projectUpdateSchema.parse(await request.json()),
    );
    return NextResponse.json({ project });
  });
}
