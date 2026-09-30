ALTER TABLE email_verifications ADD COLUMN code_hash text;
--> statement-breakpoint
ALTER TABLE email_verifications ADD COLUMN code_attempts smallint NOT NULL DEFAULT 0 CHECK (code_attempts >= 0 AND code_attempts <= 5);
--> statement-breakpoint
CREATE UNIQUE INDEX email_verifications_code_hash_unique ON email_verifications(code_hash) WHERE code_hash IS NOT NULL;
