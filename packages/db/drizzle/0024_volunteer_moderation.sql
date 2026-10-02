CREATE TABLE moderator_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  motivation text NOT NULL CHECK (char_length(motivation) BETWEEN 40 AND 2000),
  relevant_experience text CHECK (relevant_experience IS NULL OR char_length(relevant_experience) <= 2000),
  weekly_availability text NOT NULL CHECK (char_length(weekly_availability) BETWEEN 3 AND 280),
  agreed_to_code boolean NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','DECLINED','WITHDRAWN','REVOKED')),
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 1200),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX moderator_applications_open_user_idx
  ON moderator_applications(user_id) WHERE status IN ('PENDING','APPROVED');
--> statement-breakpoint
CREATE INDEX moderator_applications_status_created_idx
  ON moderator_applications(status,created_at DESC);
--> statement-breakpoint
CREATE TABLE moderator_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('TRIAGE','CONTENT_REVIEWER','APPEALS_REVIEWER','COMMUNITY_STEWARD')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),
  assigned_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoke_reason text CHECK (revoke_reason IS NULL OR char_length(revoke_reason) <= 1200),
  CHECK ((status='ACTIVE' AND revoked_at IS NULL) OR (status='REVOKED' AND revoked_at IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX moderator_role_assignments_active_user_role_idx
  ON moderator_role_assignments(user_id,role) WHERE status='ACTIVE';
--> statement-breakpoint
CREATE INDEX moderator_role_assignments_active_user_idx
  ON moderator_role_assignments(user_id) WHERE status='ACTIVE';
--> statement-breakpoint
CREATE TABLE moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subject_path text NOT NULL CHECK (
    subject_path ~ '^/[^[:space:]]*$' AND subject_path !~ '^//'
    AND position(E'\\' in subject_path)=0 AND char_length(subject_path) <= 500
  ),
  category text NOT NULL CHECK (category IN ('SPAM','HARASSMENT','IMPERSONATION','SAFETY','PRIVACY','OTHER')),
  details text NOT NULL CHECK (char_length(details) BETWEEN 20 AND 2000),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','UNDER_REVIEW','RESOLVED','DISMISSED')),
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  resolution_note text CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 1200),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX moderation_reports_status_created_idx ON moderation_reports(status,created_at DESC);
--> statement-breakpoint
CREATE INDEX moderation_reports_reporter_created_idx ON moderation_reports(reporter_id,created_at DESC);
