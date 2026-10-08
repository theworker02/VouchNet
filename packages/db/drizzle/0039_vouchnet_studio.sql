CREATE TABLE studio_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  contact_email text NOT NULL,
  business_name text,
  website_url text,
  service_type text NOT NULL,
  package_id text NOT NULL,
  requirements jsonb NOT NULL,
  budget text NOT NULL,
  desired_completion_date date,
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','QUOTE_PENDING','QUOTE_APPROVED','PAYMENT_PENDING','PAID','UNDER_REVIEW','IN_PROGRESS','AWAITING_FEEDBACK','COMPLETED','CANCELLED')),
  deposit_cents integer CHECK (deposit_cents IS NULL OR deposit_cents >= 0),
  quote_description text,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX studio_requests_owner_created_idx ON studio_requests(owner_id,created_at DESC);
--> statement-breakpoint
CREATE INDEX studio_requests_status_created_idx ON studio_requests(status,created_at DESC);
--> statement-breakpoint
CREATE TABLE studio_request_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES studio_requests(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name text NOT NULL,
  safe_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg')),
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  sha256 text NOT NULL,
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX studio_request_files_request_idx ON studio_request_files(request_id,created_at);
--> statement-breakpoint
CREATE TABLE studio_project_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES studio_requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_role text NOT NULL CHECK (author_role IN ('CUSTOMER','ADMIN')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX studio_project_messages_request_created_idx ON studio_project_messages(request_id,created_at);
--> statement-breakpoint
CREATE TABLE studio_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES studio_requests(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf','application/zip','image/png','image/jpeg')),
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 52428800),
  sha256 text NOT NULL,
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX studio_deliverables_request_created_idx ON studio_deliverables(request_id,created_at);
--> statement-breakpoint
CREATE TABLE studio_payment_events (
  stripe_event_id text PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES studio_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE studio_email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES studio_requests(id) ON DELETE CASCADE,
  delivery_type text NOT NULL CHECK (delivery_type IN ('ADMIN_PROJECT_SUMMARY','CUSTOMER_CONFIRMATION')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENDING','SENT','FAILED')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id,delivery_type)
);
--> statement-breakpoint
CREATE TABLE studio_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES studio_requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX studio_audit_events_request_created_idx ON studio_audit_events(request_id,created_at DESC);
