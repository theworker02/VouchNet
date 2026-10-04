-- Desktop uses a separate machine credential family, never the browser's nexus_session cookie.
CREATE TABLE desktop_authorization_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_challenge text NOT NULL CHECK (char_length(code_challenge) BETWEEN 43 AND 128),
  state text NOT NULL CHECK (char_length(state) BETWEEN 16 AND 512),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX desktop_authorization_codes_user_expiry_idx
  ON desktop_authorization_codes(user_id, expires_at DESC) WHERE used_at IS NULL;
--> statement-breakpoint
CREATE TABLE desktop_token_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE desktop_refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  family_id uuid NOT NULL REFERENCES desktop_token_families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  replaced_by_id uuid REFERENCES desktop_refresh_tokens(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX desktop_refresh_tokens_family_idx ON desktop_refresh_tokens(family_id);
--> statement-breakpoint
CREATE TABLE desktop_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES desktop_token_families(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX desktop_access_tokens_active_idx
  ON desktop_access_tokens(token_hash, expires_at) WHERE revoked_at IS NULL;
