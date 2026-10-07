-- A public directory record is never an official organization page until a human review verifies
-- control of a company-domain email. Claim requests and member governance remain separate from
-- outbound outreach; this migration contains no delivery mechanism.
CREATE TABLE organization_claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  claimant_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verified_email text NOT NULL,
  verified_email_domain text NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('FOUNDER','EXECUTIVE','EMPLOYEE','AUTHORIZED_REPRESENTATIVE')),
  statement text NOT NULL CHECK (char_length(statement) BETWEEN 20 AND 2400),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','UNDER_REVIEW','APPROVED','REJECTED','CANCELLED','REVOKED')),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 1200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX organization_claim_requests_open_per_member_idx
  ON organization_claim_requests(organization_id,claimant_user_id)
  WHERE status IN ('PENDING','UNDER_REVIEW');
--> statement-breakpoint
CREATE INDEX organization_claim_requests_queue_idx
  ON organization_claim_requests(status, created_at DESC);
--> statement-breakpoint

ALTER TABLE organization_members
  ADD COLUMN status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),
  ADD COLUMN revoked_at timestamptz,
  ADD COLUMN revoked_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN revoke_reason text CHECK (revoke_reason IS NULL OR char_length(revoke_reason) <= 1200);
--> statement-breakpoint
CREATE INDEX organization_members_active_role_idx
  ON organization_members(organization_id, role) WHERE status='ACTIVE';
--> statement-breakpoint

-- A small, append-only organization-specific ledger complements the platform audit table with
-- role transitions and claim decisions that can be inspected by an administrator.
CREATE TABLE organization_governance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  subject_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  claim_request_id uuid REFERENCES organization_claim_requests(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'CLAIM_REQUESTED','CLAIM_APPROVED','CLAIM_REJECTED','CLAIM_CANCELLED','CLAIM_REVOKED',
    'ROLE_ASSIGNED','OWNERSHIP_TRANSFERRED','MEMBER_REVOKED','PROFILE_UPDATED'
  )),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX organization_governance_events_org_created_idx
  ON organization_governance_events(organization_id, created_at DESC);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_organization_governance_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'organization_governance_events is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER organization_governance_events_append_only
BEFORE UPDATE OR DELETE ON organization_governance_events
FOR EACH ROW EXECUTE FUNCTION prevent_organization_governance_event_mutation();
--> statement-breakpoint

-- Staging records make prospective recipients reviewable. They are deliberately not connected to
-- any email sender; an explicit future approval is required before an invite can be created.
CREATE TABLE organization_outreach_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  proposed_email text NOT NULL,
  source_url text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','SENT','SUPPRESSED')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, proposed_email)
);
--> statement-breakpoint
CREATE INDEX organization_outreach_candidates_status_idx
  ON organization_outreach_candidates(status, created_at DESC);
