-- Invitations that let a representative claim an existing public directory record as their
-- official organization profile. Only the SHA-256 hash of the claim token is stored.
CREATE TABLE organization_claim_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email_normalized text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  invited_by uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CLAIMED','REVOKED')),
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz,
  claimed_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX organization_claim_invites_org_idx
  ON organization_claim_invites(organization_id, created_at);
CREATE INDEX organization_claim_invites_email_idx
  ON organization_claim_invites(email_normalized) WHERE status='PENDING';
