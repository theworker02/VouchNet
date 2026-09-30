CREATE TABLE "audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "occurred_at" timestamptz DEFAULT now() NOT NULL,
  "actor_type" text NOT NULL, "actor_id" uuid, "user_id" uuid, "organization_id" uuid, "session_id" uuid, "credential_id" uuid,
  "operation" text NOT NULL, "resource_type" text NOT NULL, "resource_id" uuid, "request_id" uuid NOT NULL, "approval_id" uuid,
  "risk_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL, "result" text NOT NULL, "policy_decision" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_events_user_occurred_idx" ON "audit_events" USING btree ("user_id", "occurred_at");
--> statement-breakpoint
CREATE INDEX "audit_events_request_idx" ON "audit_events" USING btree ("request_id");
--> statement-breakpoint
CREATE TABLE "trust_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "occurred_at" timestamptz DEFAULT now() NOT NULL,
  "subject_type" text NOT NULL, "subject_id" uuid NOT NULL, "signal_code" text NOT NULL, "score" bigint NOT NULL,
  "decision" text NOT NULL, "reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL, "request_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE INDEX "trust_events_subject_occurred_idx" ON "trust_events" USING btree ("subject_type", "subject_id", "occurred_at");
--> statement-breakpoint
CREATE TABLE "rate_limit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "occurred_at" timestamptz DEFAULT now() NOT NULL,
  "dimension" text NOT NULL, "subject_hash" text NOT NULL, "policy" text NOT NULL, "action" text NOT NULL, "request_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_events_subject_occurred_idx" ON "rate_limit_events" USING btree ("dimension", "subject_hash", "occurred_at");
--> statement-breakpoint
