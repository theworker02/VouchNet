import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import { JobSourcingError, submitEmployerJob } from '../../../lib/jobs';
import { hasSameOrigin } from '../../../lib/request-security';

const httpsUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === 'https:', 'An HTTPS URL is required.');

const jobSubmissionSchema = z
  .object({
    applicationUrl: httpsUrl,
    description: z.string().trim().min(80).max(12_000),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']),
    location: z.string().trim().min(2).max(160),
    organizationName: z.string().trim().min(2).max(160),
    organizationWebsite: httpsUrl,
    salaryCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/),
    salaryMax: z.number().int().positive().nullable(),
    salaryMin: z.number().int().positive().nullable(),
    skillTags: z
      .array(z.string().trim().min(1).max(40))
      .max(12)
      .transform((tags) => [...new Set(tags.map((tag) => tag.toLowerCase()))]),
    summary: z.string().trim().min(30).max(600),
    title: z.string().trim().min(3).max(160),
    workplaceType: z.enum(['REMOTE', 'HYBRID', 'ONSITE']),
  })
  .superRefine((input, context) => {
    if ((input.salaryMin === null) !== (input.salaryMax === null)) {
      context.addIssue({
        code: 'custom',
        message: 'Provide both salary values or leave both blank.',
      });
    }
    if (input.salaryMin !== null && input.salaryMax !== null && input.salaryMax < input.salaryMin) {
      context.addIssue({ code: 'custom', message: 'Maximum salary must be at least the minimum.' });
    }
  });

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const job = await submitEmployerJob(
      actor.userId,
      jobSubmissionSchema.parse(await request.json()),
    );
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof JobSourcingError)
      return NextResponse.json({ error: error.code }, { status: 409 });
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_JOB_SUBMISSION' : 'JOB_SUBMISSION_FAILED' },
      { status: 400 },
    );
  }
}
