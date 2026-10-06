import { NextRequest, NextResponse } from 'next/server';
import { guardedWrite } from '../../lib/build-route';
import { projectInputSchema } from '../../lib/project-model';
import { createProject } from '../../lib/projects';

export async function POST(request: NextRequest) {
  return guardedWrite(request, 'PROJECT_CREATION_FAILED', async (actor) => {
    const project = await createProject(
      actor.userId,
      projectInputSchema.parse(await request.json()),
    );
    return NextResponse.json({ project }, { status: 201 });
  });
}
