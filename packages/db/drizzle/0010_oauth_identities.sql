CREATE TABLE oauth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL CHECK (provider IN ('GOOGLE','GITHUB','LINKEDIN')),
  provider_subject text NOT NULL,
  provider_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject),
  UNIQUE (user_id, provider)
);
--> statement-breakpoint
CREATE INDEX oauth_identities_user_idx ON oauth_identities(user_id);
