import { Shell } from '../../components/shell';
import { DeveloperModeSettings } from './settings-client';

export const metadata = { title: 'VouchNet Labs', robots: { index: false } };

export default function LabsSettingsPage() {
  return (
    <Shell>
      <DeveloperModeSettings />
    </Shell>
  );
}
