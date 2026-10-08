import { redirect } from 'next/navigation';
import { Shell } from '../../components/shell';
import { StudioRequestForm } from '../../components/studio-request-form';
import { getCurrentActor } from '../../lib/identity';
export const metadata = { title: 'Start a Studio project | VouchNet' };
export default async function StudioRequestPage() {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login?next=/studio/request');
  return (
    <Shell>
      <section className="studio-request-page">
        <p className="eyebrow">VouchNet Studio</p>
        <h1>Bring a complete technical brief.</h1>
        <p>
          We ask for full project detail up front so the right scope, deposit, and delivery plan can
          be discussed before work begins.
        </p>
        <StudioRequestForm />
      </section>
    </Shell>
  );
}
