import { Shell } from '../components/shell';
import { getCurrentActor, getProfileSummary } from '../lib/identity';
import { OnboardingForm } from './onboarding-form';
export default async function Onboarding() {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  const profile = await getProfileSummary(actor.userId);
  if (profile === null) return null;
  return (
    <Shell>
      <p className="eyebrow">Onboarding</p>
      <h1>Make your profile useful from day one.</h1>
      <p>
        Start with the professional context people need. These fields are optional, persist when you
        save, and can be changed later.
      </p>
      <OnboardingForm
        headline={profile.headline ?? ''}
        location={profile.location ?? ''}
        about={profile.about ?? ''}
        onboardingStep={profile.onboardingStep}
      />
    </Shell>
  );
}
