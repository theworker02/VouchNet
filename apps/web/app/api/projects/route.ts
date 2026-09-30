import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../lib/identity';
import { createProject } from '../../lib/projects';
import { hasSameOrigin } from '../../lib/request-security';

const projectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  summary: z.string().trim().min(10).max(280),
  description: z.string().trim().min(10).max(12_000),
  status: z.enum(['IDEA', 'ACTIVE', 'SHIPPED', 'ARCHIVED']),
  projectUrl: z.string().url().optional(),
  repositoryUrl: z.string().url().optional(),
  documentationUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(12)
    .transform((tags) => [...new Set(tags.map((tag) => tag.toLowerCase()))]),
});

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const project = await createProject(actor.userId, projectSchema.parse(await request.json()));
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_PROJECT' : 'PROJECT_CREATION_FAILED' },
      { status: 400 },
    );
  }
}
