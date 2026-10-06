-- Optional third-party identity verification. VouchNet stores only the provider's opaque
-- session reference and outcome; document images and biometric data never leave the provider.
CREATE TABLE identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL,
  provider_session_id text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','REQUIRES_INPUT','VERIFIED','CANCELED')),
  method text,
  verified_at timestamptz,
  badge_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_session_id)
);

-- A member has at most one successful verification record; re-checks use the latest row.
CREATE UNIQUE INDEX identity_verifications_user_verified_idx
  ON identity_verifications(user_id) WHERE status='VERIFIED';
CREATE INDEX identity_verifications_user_created_idx
  ON identity_verifications(user_id, created_at);
