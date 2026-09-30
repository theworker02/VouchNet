'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
type SettingSection = 'account' | 'security' | 'visibility' | 'notifications' | 'data';
type UserSettings = {
  preferences: {
    theme: 'LIGHT' | 'DARK' | 'SYSTEM';
    reducedMotion: boolean;
    codeFont: 'FIRA_CODE' | 'JETBRAINS_MONO';
    language: string;
    timezone: string;
  };
  privacy: {
    profileVisibility: 'PUBLIC' | 'MEMBERS' | 'CONNECTIONS' | 'PRIVATE';
    searchIndexing: boolean;
    activeStatus: boolean;
    connectionVisibility: 'ONLY_ME' | 'CONNECTIONS' | 'PUBLIC';
    aiTrainingAllowed: boolean;
  };
  notifications: {
    frequency: 'REAL_TIME' | 'DAILY_DIGEST' | 'PAUSED';
    channels: Record<
      'DIRECT_MESSAGES' | 'PEER_ENDORSEMENTS' | 'MENTIONS' | 'JOB_MATCHES' | 'SYSTEM_UPDATES',
      { inApp: boolean; email: boolean; push: boolean }
    >;
  };
};
const settingSections: readonly SettingSection[] = [
  'account',
  'security',
  'visibility',
  'notifications',
  'data',
];

const labels: Record<SettingSection, string> = {
  account: 'Account preferences',
  security: 'Sign-in & security',
  visibility: 'Visibility & privacy',
  notifications: 'Notifications',
  data: 'Data & export',
};
const channelLabels = {
  DIRECT_MESSAGES: 'Direct messages',
  PEER_ENDORSEMENTS: 'Peer endorsements',
  MENTIONS: 'Mention alerts',
  JOB_MATCHES: 'Job matches',
  SYSTEM_UPDATES: 'System updates',
} as const;

export function SettingsClient({ section }: { section: SettingSection }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => {
    void fetch('/api/settings')
      .then(async (response) =>
        response.ok ? (response.json() as Promise<{ settings: UserSettings }>) : Promise.reject(),
      )
      .then((body) => setSettings(body.settings))
      .catch(() => setStatus('error'));
  }, []);
  async function save() {
    if (settings === null) return;
    setStatus('saving');
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setStatus(response.ok ? 'saved' : 'error');
  }
  if (settings === null) return <p className="empty">Loading your settings…</p>;
  const privacyToggle = (key: keyof UserSettings['privacy'], text: string) => (
    <label className="setting-toggle">
      <input
        type="checkbox"
        checked={Boolean(settings.privacy[key])}
        onChange={(event) =>
          setSettings({
            ...settings,
            privacy: { ...settings.privacy, [key]: event.target.checked },
          })
        }
      />
      {text}
    </label>
  );
  return (
    <div className="settings-layout">
      <aside className="settings-nav">
        <p className="eyebrow">Settings</p>
        {settingSections.map((item) => (
          <Link
            className={section === item ? 'active-setting' : ''}
            key={item}
            href={`/settings/${item}`}
          >
            {labels[item]}
          </Link>
        ))}
      </aside>
      <section className="settings-panel">
        <p className="eyebrow">Settings</p>
        <h1>{labels[section]}</h1>
        {section === 'account' ? (
          <>
            <h2>Site display</h2>
            <label>
              Theme
              <select
                value={settings.preferences.theme}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    preferences: {
                      ...settings.preferences,
                      theme: e.target.value as UserSettings['preferences']['theme'],
                    },
                  })
                }
              >
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
                <option value="SYSTEM">System</option>
              </select>
            </label>
            <label>
              Code font
              <select
                value={settings.preferences.codeFont}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    preferences: {
                      ...settings.preferences,
                      codeFont: e.target.value as UserSettings['preferences']['codeFont'],
                    },
                  })
                }
              >
                <option value="JETBRAINS_MONO">JetBrains Mono</option>
                <option value="FIRA_CODE">Fira Code</option>
              </select>
            </label>
            <label className="setting-toggle">
              <input
                type="checkbox"
                checked={settings.preferences.reducedMotion}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, reducedMotion: e.target.checked },
                  })
                }
              />
              Reduce motion
            </label>
            <h2>Account management</h2>
            <p className="muted-copy">
              Account merge, deactivation, and permanent deletion require a verified,
              re-authenticated workflow and are not exposed as one-click controls.
            </p>
          </>
        ) : null}
        {section === 'security' ? (
          <>
            <h2>Security center</h2>
            <p className="muted-copy">
              Review and revoke active sessions from the security center. Password changes and MFA
              enrollment are deliberately withheld until a verified secret-storage and recovery
              implementation is available.
            </p>
            <Link className="secondary" href="/settings/security">
              Review active sessions
            </Link>
          </>
        ) : null}
        {section === 'visibility' ? (
          <>
            <h2>Professional visibility</h2>
            {privacyToggle('searchIndexing', 'Allow search engines to index my public profile')}
            {privacyToggle('activeStatus', 'Show my active status')}
            {privacyToggle(
              'aiTrainingAllowed',
              'Allow my public content in public AI training datasets',
            )}
            <label>
              Profile visibility
              <select
                value={settings.privacy.profileVisibility}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    privacy: {
                      ...settings.privacy,
                      profileVisibility: e.target
                        .value as UserSettings['privacy']['profileVisibility'],
                    },
                  })
                }
              >
                <option value="PUBLIC">Public</option>
                <option value="MEMBERS">Members</option>
                <option value="CONNECTIONS">Connections</option>
                <option value="PRIVATE">Only me</option>
              </select>
            </label>
            <label>
              Who can see connections
              <select
                value={settings.privacy.connectionVisibility}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    privacy: {
                      ...settings.privacy,
                      connectionVisibility: e.target
                        .value as UserSettings['privacy']['connectionVisibility'],
                    },
                  })
                }
              >
                <option value="ONLY_ME">Only me</option>
                <option value="CONNECTIONS">Connections</option>
                <option value="PUBLIC">Public</option>
              </select>
            </label>
          </>
        ) : null}
        {section === 'notifications' ? (
          <>
            <h2>Channels</h2>
            <div className="notification-matrix">
              <span>Category</span>
              <span>In-app</span>
              <span>Email</span>
              <span>Push</span>
              {Object.entries(channelLabels).map(([key, label]) => (
                <div className="notification-row" key={key}>
                  <strong>{label}</strong>
                  {(['inApp', 'email', 'push'] as const).map((channel) => (
                    <input
                      aria-label={`${label} ${channel}`}
                      key={channel}
                      type="checkbox"
                      checked={
                        settings.notifications.channels[key as keyof typeof channelLabels][channel]
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            channels: {
                              ...settings.notifications.channels,
                              [key]: {
                                ...settings.notifications.channels[
                                  key as keyof typeof channelLabels
                                ],
                                [channel]: e.target.checked,
                              },
                            },
                          },
                        })
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
            <label>
              Email frequency
              <select
                value={settings.notifications.frequency}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      frequency: e.target.value as UserSettings['notifications']['frequency'],
                    },
                  })
                }
              >
                <option value="REAL_TIME">Real-time</option>
                <option value="DAILY_DIGEST">Daily digest</option>
                <option value="PAUSED">Pause all</option>
              </select>
            </label>
          </>
        ) : null}
        {section === 'data' ? (
          <>
            <h2>Your data</h2>
            <p className="muted-copy">
              A portability archive needs asynchronous object storage and notification delivery. The
              schema is ready; ZIP generation is intentionally not represented by a nonfunctional
              download button.
            </p>
            <p className="muted-copy">
              Published media records include owner, type, size, alternative text, and a storage
              key. Actual uploads require an S3/R2 provider configuration.
            </p>
          </>
        ) : null}
        {section !== 'data' ? (
          <>
            <button onClick={() => void save()} disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving…' : 'Save preferences'}
            </button>
            {status === 'saved' ? <p className="action-feedback">Preferences saved.</p> : null}
            {status === 'error' ? (
              <p className="form-error">Settings could not be loaded or saved.</p>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
