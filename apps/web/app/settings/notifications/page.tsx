import { Shell } from '../../components/shell';
import { SettingsClient } from '../settings-client';
export default function NotificationSettings() {
  return (
    <Shell>
      <SettingsClient section="notifications" />
    </Shell>
  );
}
