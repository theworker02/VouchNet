import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Shell } from '../../../components/shell';
import { StudioConversation } from '../../../components/studio-conversation';
import { getCurrentActor } from '../../../lib/identity';
import { getStudioConversation, getStudioRequestForOwner } from '../../../lib/studio';
export const metadata = { title: 'Studio project | VouchNet', robots: { index: false } };
export default async function StudioProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login');
  const id = (await params).id;
  const [project, conversation] = await Promise.all([
    getStudioRequestForOwner(actor.userId, id),
    getStudioConversation(actor.userId, id, false),
  ]);
  if (project === null || conversation === null) notFound();
  return (
    <Shell>
      <section className="studio-dashboard">
        <Link href="/studio/projects">← All Studio projects</Link>
        <p className="eyebrow">{project.orderNumber}</p>
        <h1>{project.status.replaceAll('_', ' ')}</h1>
        <p>
          {project.quoteDescription ??
            'Your project brief is securely stored. Status updates and messages will appear here.'}
        </p>
        <StudioConversation
          requestId={id}
          initialMessages={conversation.messages.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
          }))}
        />
      </section>
    </Shell>
  );
}
