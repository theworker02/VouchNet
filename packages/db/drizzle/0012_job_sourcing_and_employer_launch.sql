-- Public sources may omit compensation. Keep the data honest and deprioritize it in the directory.
ALTER TABLE jobs ALTER COLUMN salary_min DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE jobs ALTER COLUMN salary_max DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE jobs DROP CONSTRAINT jobs_workplace_type_check;
--> statement-breakpoint
ALTER TABLE jobs ADD CONSTRAINT jobs_workplace_type_check CHECK (workplace_type IN ('REMOTE','HYBRID','ONSITE','UNSPECIFIED'));
--> statement-breakpoint
ALTER TABLE jobs DROP CONSTRAINT jobs_employment_type_check;
--> statement-breakpoint
ALTER TABLE jobs ADD CONSTRAINT jobs_employment_type_check CHECK (employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','UNSPECIFIED'));
--> statement-breakpoint
ALTER TABLE jobs DROP CONSTRAINT jobs_source_status_check;
--> statement-breakpoint
ALTER TABLE jobs ADD CONSTRAINT jobs_source_status_check CHECK (source_status IN ('SOURCE_REVIEWED','SOURCE_LIVE','PENDING_REVIEW','EXPIRED','REMOVED','REJECTED'));
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN description text;
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN origin text NOT NULL DEFAULT 'CURATED' CHECK (origin IN ('CURATED','PROVIDER_IMPORT','EMPLOYER_SUBMISSION'));
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN source_provider text CHECK (source_provider IN ('GREENHOUSE','LEVER'));
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN external_job_id text;
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN employer_review_status text NOT NULL DEFAULT 'NOT_REQUIRED' CHECK (employer_review_status IN ('NOT_REQUIRED','PENDING','APPROVED','REJECTED'));
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN posting_owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN launch_waiver_expires_at timestamptz;
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN published_at timestamptz;
--> statement-breakpoint
ALTER TABLE jobs ADD CONSTRAINT jobs_compensation_pair_check CHECK ((salary_min IS NULL AND salary_max IS NULL) OR (salary_min IS NOT NULL AND salary_max IS NOT NULL AND salary_min > 0 AND salary_max >= salary_min));
--> statement-breakpoint
CREATE UNIQUE INDEX jobs_provider_external_id_idx ON jobs(source_provider,external_job_id) WHERE source_provider IS NOT NULL AND external_job_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX jobs_public_discovery_idx ON jobs(source_status,employer_review_status,source_checked_at DESC) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX jobs_owner_submissions_idx ON jobs(posting_owner_user_id,created_at DESC) WHERE posting_owner_user_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE employer_launch_trials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '2 months'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE job_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('GREENHOUSE','LEVER')),
  board_token text NOT NULL CHECK (board_token ~ '^[A-Za-z0-9_-]{2,100}$'),
  board_url text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW','ACTIVE','PAUSED','REJECTED')),
  last_synced_at timestamptz,
  last_sync_status text CHECK (last_sync_status IN ('SUCCESS','FAILED')),
  last_sync_error text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,board_token)
);
--> statement-breakpoint
CREATE INDEX job_sources_owner_created_idx ON job_sources(owner_user_id,created_at DESC);
--> statement-breakpoint
CREATE INDEX job_sources_active_sync_idx ON job_sources(status,last_synced_at) WHERE status='ACTIVE';
