CREATE TABLE developer_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  client_id text NOT NULL UNIQUE,
  client_secret_hash text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  redirect_uris jsonb NOT NULL,
  allowed_scopes jsonb NOT NULL DEFAULT '["profile:read"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
--> statement-breakpoint
CREATE INDEX developer_clients_owner_created_idx ON developer_clients(owner_id,created_at DESC);
--> statement-breakpoint
CREATE TABLE oauth_authorization_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES developer_clients(id),
  user_id uuid NOT NULL REFERENCES users(id),
  code_hash text NOT NULL UNIQUE,
  redirect_uri text NOT NULL,
  scopes jsonb NOT NULL,
  code_challenge text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX oauth_authorization_codes_client_expires_idx ON oauth_authorization_codes(client_id,expires_at DESC);
--> statement-breakpoint
CREATE TABLE oauth_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES developer_clients(id),
  user_id uuid NOT NULL REFERENCES users(id),
  token_hash text NOT NULL UNIQUE,
  scopes jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX oauth_access_tokens_client_user_idx ON oauth_access_tokens(client_id,user_id);
