import { Shell } from '../../components/shell';
import { SettingsClient } from '../settings-client';
export default function AccountSettings() {
  return (
    <Shell>
      <SettingsClient section="account" />
    </Shell>
  );
}
