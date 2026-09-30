import { Shell } from '../../components/shell';
import { SettingsClient } from '../settings-client';
export default function SecuritySettingsPage() {
  return (
    <Shell>
      <SettingsClient section="security" />
    </Shell>
  );
}
