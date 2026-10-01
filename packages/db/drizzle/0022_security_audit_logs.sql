CREATE TABLE security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN (
    'FAILED_LOGIN_ATTEMPT',
    'LOGIN_SUCCEEDED',
    'PASSWORD_RESET',
    'OAUTH_APP_CREATED',
    'OAUTH_APP_REVOKED',
    'PRIVILEGE_ELEVATION',
    'SUSPICIOUS_RATE_LIMIT_EXCEEDED'
  )),
  ip_hash text NOT NULL CHECK (char_length(ip_hash) = 64),
  user_agent text,
  request_id uuid,
  status text NOT NULL CHECK (status IN ('SUCCESS', 'DENIED', 'FAILURE')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE INDEX security_audit_logs_action_occurred_idx ON security_audit_logs(action, occurred_at DESC);
--> statement-breakpoint
CREATE INDEX security_audit_logs_actor_occurred_idx ON security_audit_logs(actor_id, occurred_at DESC);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_security_audit_log_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'security_audit_logs is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER security_audit_logs_append_only
BEFORE UPDATE OR DELETE ON security_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_security_audit_log_mutation();
