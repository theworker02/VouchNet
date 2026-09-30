import { Shell } from '../../components/shell';
import { SettingsClient } from '../settings-client';
export default function DataSettings() {
  return (
    <Shell>
      <SettingsClient section="data" />
    </Shell>
  );
}
