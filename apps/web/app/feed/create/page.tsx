import { redirect } from 'next/navigation';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { ExperienceComposer } from '../../modules/experiences/experience-composer';

export const metadata = { title: 'Create Experience | VouchNet', robots: { index: false } };

export default async function CreateExperiencePage() {
  if ((await getCurrentActor()) === null) redirect('/login?next=/feed/create');
  return (
    <Shell>
      <ExperienceComposer />
    </Shell>
  );
}
