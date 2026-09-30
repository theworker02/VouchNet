import { createSqlClient } from '@nexus/db';

export const settingSections = [
  'account',
  'security',
  'visibility',
  'notifications',
  'data',
] as const;
export type SettingSection = (typeof settingSections)[number];

export interface UserSettings {
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
    displayVouches: boolean;
  };
  notifications: {
    frequency: 'REAL_TIME' | 'DAILY_DIGEST' | 'PAUSED';
    channels: Record<
      'DIRECT_MESSAGES' | 'PEER_ENDORSEMENTS' | 'MENTIONS' | 'JOB_MATCHES' | 'SYSTEM_UPDATES',
      { inApp: boolean; email: boolean; push: boolean }
    >;
  };
}

const defaults: UserSettings = {
  preferences: {
    theme: 'SYSTEM',
    reducedMotion: false,
    codeFont: 'JETBRAINS_MONO',
    language: 'en',
    timezone: 'UTC',
  },
  privacy: {
    profileVisibility: 'PUBLIC',
    searchIndexing: true,
    activeStatus: true,
    connectionVisibility: 'CONNECTIONS',
    aiTrainingAllowed: false,
    displayVouches: true,
  },
  notifications: {
    frequency: 'REAL_TIME',
    channels: {
      DIRECT_MESSAGES: { inApp: true, email: true, push: true },
      PEER_ENDORSEMENTS: { inApp: true, email: false, push: false },
      MENTIONS: { inApp: true, email: true, push: true },
      JOB_MATCHES: { inApp: true, email: true, push: false },
      SYSTEM_UPDATES: { inApp: true, email: true, push: false },
    },
  },
};

function client() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const sql = client();
  try {
    const rows = await sql<
      {
        preferences: UserSettings['preferences'];
        privacy: UserSettings['privacy'];
        notifications: UserSettings['notifications'];
      }[]
    >`SELECT preferences,privacy,notifications FROM user_settings WHERE user_id=${userId}`;
    const row = rows[0];
    // Settings were introduced incrementally. Merge persisted JSON with defaults so a newly
    // added privacy control never becomes implicitly disabled for existing members.
    return row === undefined
      ? defaults
      : {
          preferences: { ...defaults.preferences, ...row.preferences },
          privacy: { ...defaults.privacy, ...row.privacy },
          notifications: {
            ...defaults.notifications,
            ...row.notifications,
            channels: { ...defaults.notifications.channels, ...row.notifications.channels },
          },
        };
  } finally {
    await sql.end({ timeout: 1 });
  }
}
export async function saveUserSettings(userId: string, settings: UserSettings) {
  const sql = client();
  try {
    await sql`INSERT INTO user_settings (user_id,preferences,privacy,notifications) VALUES (${userId},${sql.json(settings.preferences)},${sql.json(settings.privacy)},${sql.json(settings.notifications)}) ON CONFLICT (user_id) DO UPDATE SET preferences=EXCLUDED.preferences,privacy=EXCLUDED.privacy,notifications=EXCLUDED.notifications,updated_at=now()`;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
