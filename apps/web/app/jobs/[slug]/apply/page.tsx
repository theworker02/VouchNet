import { redirect, notFound } from 'next/navigation';
import { Shell } from '../../../components/shell';
import { getPublicJob } from '../../../lib/directory';
import { getCurrentActor } from '../../../lib/identity';
import { NativeApplyClient } from './apply-client';

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const [actor, job] = await Promise.all([getCurrentActor(), getPublicJob(slug)]);
  if (actor === null) redirect(`/login?next=${encodeURIComponent(`/jobs/${slug}/apply`)}`);
  if (job === null || !job.nativeApplicationEnabled) notFound();
  return (
    <Shell>
      <NativeApplyClient slug={slug} title={job.title} />
    </Shell>
  );
}
