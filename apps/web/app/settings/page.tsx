import { Shell } from '../components/shell';
import { SettingsClient } from './settings-client';
export default function SettingsPage() {
  return (
    <Shell>
      <SettingsClient section="account" />
    </Shell>
  );
}
