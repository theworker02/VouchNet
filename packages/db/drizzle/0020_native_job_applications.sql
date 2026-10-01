ALTER TABLE jobs ADD COLUMN native_application_enabled boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cover_note text NOT NULL DEFAULT '' CHECK (char_length(cover_note) <= 4000),
  custom_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_stage text NOT NULL DEFAULT 'SUBMITTED' CHECK (current_stage IN ('SUBMITTED','AI_VETTED','TECHNICAL_REVIEW','INTERVIEW_SCHEDULED','OFFER','REJECTED')),
  vouch_score_snapshot integer NOT NULL DEFAULT 0 CHECK (vouch_score_snapshot >= 0),
  source text NOT NULL DEFAULT 'NATIVE_BOARD' CHECK (source IN ('NATIVE_BOARD','OAUTH_WIDGET')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id,candidate_id)
);
--> statement-breakpoint
CREATE INDEX job_applications_candidate_tracker_idx ON job_applications(candidate_id,created_at DESC);
--> statement-breakpoint
CREATE INDEX job_applications_job_stage_idx ON job_applications(job_id,current_stage,created_at DESC);
--> statement-breakpoint
CREATE TABLE job_application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('SUBMITTED','STAGE_CHANGED','CANDIDATE_WITHDREW')),
  stage_from text,
  stage_to text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX job_application_events_application_idx ON job_application_events(application_id,created_at DESC);
