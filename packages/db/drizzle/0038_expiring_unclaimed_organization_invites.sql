-- Expiration is distinct from revocation so administrators can explain why an unclaimed public
-- listing disappeared. The organization row is soft-deleted by the scheduled cleanup function.
ALTER TABLE organization_claim_invites
  DROP CONSTRAINT IF EXISTS organization_claim_invites_status_check;
--> statement-breakpoint
ALTER TABLE organization_claim_invites
  ADD CONSTRAINT organization_claim_invites_status_check
  CHECK (status IN ('PENDING','CLAIMED','REVOKED','EXPIRED'));
--> statement-breakpoint

ALTER TABLE organization_governance_events
  DROP CONSTRAINT IF EXISTS organization_governance_events_event_type_check;
--> statement-breakpoint
ALTER TABLE organization_governance_events
  ADD CONSTRAINT organization_governance_events_event_type_check
  CHECK (event_type IN (
    'CLAIM_REQUESTED','CLAIM_APPROVED','CLAIM_REJECTED','CLAIM_CANCELLED','CLAIM_REVOKED',
    'CLAIM_EXPIRED','DIRECTORY_RECORD_REMOVED','ROLE_ASSIGNED','OWNERSHIP_TRANSFERRED',
    'MEMBER_REVOKED','PROFILE_UPDATED'
  ));
