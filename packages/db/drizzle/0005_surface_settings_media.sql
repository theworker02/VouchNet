CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  preferences jsonb NOT NULL DEFAULT '{"theme":"SYSTEM","reducedMotion":false,"codeFont":"JETBRAINS_MONO","language":"en","timezone":"UTC"}'::jsonb,
  privacy jsonb NOT NULL DEFAULT '{"profileVisibility":"PUBLIC","searchIndexing":true,"activeStatus":true,"connectionVisibility":"CONNECTIONS","aiTrainingAllowed":false}'::jsonb,
  notifications jsonb NOT NULL DEFAULT '{"frequency":"REAL_TIME","channels":{"DIRECT_MESSAGES":{"inApp":true,"email":true,"push":true},"PEER_ENDORSEMENTS":{"inApp":true,"email":false,"push":false},"MENTIONS":{"inApp":true,"email":true,"push":true},"JOB_MATCHES":{"inApp":true,"email":true,"push":false},"SYSTEM_UPDATES":{"inApp":true,"email":true,"push":false}}}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  storage_key text NOT NULL UNIQUE,
  url text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','application/pdf')),
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 26214400),
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
--> statement-breakpoint
CREATE INDEX media_assets_owner_created_idx ON media_assets(owner_id,created_at DESC) WHERE deleted_at IS NULL;
