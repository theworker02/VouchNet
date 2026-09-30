import { Shell } from '../../components/shell';
import { SettingsClient } from '../settings-client';
export default function VisibilitySettings() {
  return (
    <Shell>
      <SettingsClient section="visibility" />
    </Shell>
  );
}
