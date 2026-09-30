import { Shell } from '../../components/shell';
import { SettingsClient } from '../settings-client';

export default function DeveloperSettings() {
  return (
    <Shell>
      <SettingsClient section="developers" />
    </Shell>
  );
}
