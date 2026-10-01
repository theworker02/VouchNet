CREATE TABLE connection_request_restrictions (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reason_code text NOT NULL CHECK (reason_code IN ('CONNECTION_REQUEST_VELOCITY')),
  imposed_at timestamptz NOT NULL DEFAULT now(),
  resets_at timestamptz NOT NULL,
  dismissed_at timestamptz,
  CHECK (resets_at > imposed_at)
);
--> statement-breakpoint
CREATE INDEX connection_request_restrictions_active_idx
  ON connection_request_restrictions(resets_at);
