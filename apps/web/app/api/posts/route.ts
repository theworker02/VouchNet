import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../lib/identity';
import { hasSameOrigin } from '../../lib/request-security';
import { createPost, postCategories, postVisibilities } from '../../modules/posts/service';

const createPostSchema = z
  .object({
    bodyMarkdown: z.string().trim().min(1).max(12_000),
    codeSnippets: z
      .array(
        z.object({
          language: z.string().trim().min(1).max(64),
          code: z.string().min(1).max(20_000),
        }),
      )
      .max(12)
      .default([]),
    mediaUrls: z.array(z.string().url()).max(10).default([]),
    category: z.enum(postCategories),
    visibility: z.enum(postVisibilities),
    quotePostId: z.string().uuid().optional(),
    mentionedUserIds: z.array(z.string().uuid()).max(20).default([]),
  })
  .superRefine((value, context) => {
    if (value.quotePostId !== undefined && value.bodyMarkdown.length < 80)
      context.addIssue({
        code: 'custom',
        path: ['bodyMarkdown'],
        message: 'Quote posts require at least 80 characters.',
      });
  });

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const post = await createPost(actor.userId, createPostSchema.parse(await request.json()));
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_POST' : 'POST_CREATION_FAILED' },
      { status: 400 },
    );
  }
}
