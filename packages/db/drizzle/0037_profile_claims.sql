-- Public directory profiles remain separate from authentication until a claim is approved.
-- This is the canonical lifecycle record; organization_claim_requests retains reviewer context.
CREATE TABLE profile_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('ORGANIZATION','INDIVIDUAL')),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  profile_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  claimant_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','VERIFICATION_REQUIRED','VERIFIED','APPROVED','REJECTED','EXPIRED','REVOKED')),
  verification_method text CHECK (verification_method IN ('COMPANY_DOMAIN_EMAIL','DNS','WEBSITE','PROFILE_EMAIL','LINKED_IDENTITY','MANUAL_REVIEW')),
  verification_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((entity_type='ORGANIZATION' AND organization_id IS NOT NULL AND profile_user_id IS NULL)
      OR (entity_type='INDIVIDUAL' AND profile_user_id IS NOT NULL AND organization_id IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX profile_claims_open_organization_idx
  ON profile_claims(organization_id, claimant_user_id)
  WHERE entity_type='ORGANIZATION' AND state IN ('PENDING','VERIFICATION_REQUIRED','VERIFIED');
--> statement-breakpoint
CREATE INDEX profile_claims_review_queue_idx ON profile_claims(state, created_at DESC);
--> statement-breakpoint
ALTER TABLE organization_claim_requests
  ADD COLUMN profile_claim_id uuid REFERENCES profile_claims(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX organization_claim_requests_profile_claim_idx
  ON organization_claim_requests(profile_claim_id) WHERE profile_claim_id IS NOT NULL;
