ALTER TABLE sessions ADD COLUMN idle_expires_at timestamptz;
--> statement-breakpoint
UPDATE sessions
SET idle_expires_at = LEAST(expires_at, last_active_at + interval '24 hours')
WHERE idle_expires_at IS NULL;
--> statement-breakpoint
ALTER TABLE sessions ALTER COLUMN idle_expires_at SET NOT NULL;
