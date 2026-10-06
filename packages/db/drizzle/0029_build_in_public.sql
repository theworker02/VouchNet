-- VouchNet: Build in Public. Self-contained; introduces Projects-as-network objects, contextual
-- vouches, the opportunity network, participation-reputation revocations, and profile intent.
ALTER TABLE profiles ADD COLUMN current_intent text CHECK (
  current_intent IS NULL OR current_intent IN
    ('AVAILABLE_FOR_WORK','LOOKING_FOR_COLLABORATORS','HIRING','LOOKING_FOR_FUNDING','JUST_NETWORKING')
);
--> statement-breakpoint
ALTER TABLE projects
  ADD COLUMN looking_for text[] NOT NULL DEFAULT '{}',
  ADD COLUMN open_source boolean NOT NULL DEFAULT false,
  ADD COLUMN status_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN last_activity_at timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint
UPDATE projects SET status = CASE status WHEN 'ACTIVE' THEN 'ACTIVE_DEVELOPMENT' WHEN 'SHIPPED' THEN 'LAUNCHED' ELSE status END,
  status_changed_at = updated_at, last_activity_at = updated_at;
--> statement-breakpoint
-- Legacy ACTIVE/SHIPPED remain accepted so a deployment window between migration and code cannot
-- reject writes from the previous application version. New code only writes the new vocabulary.
ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (
  status IN ('IDEA','ACTIVE_DEVELOPMENT','LAUNCHED','MAINTAINED','ARCHIVED','ACTIVE','SHIPPED')
);
--> statement-breakpoint
ALTER TABLE projects ADD CONSTRAINT projects_looking_for_check CHECK (
  cardinality(looking_for) <= 8 AND looking_for <@ ARRAY['DESIGNERS','TESTERS','CONTRIBUTORS','ENGINEERS','WRITERS','COFOUNDER','EARLY_USERS','FEEDBACK','MAINTAINERS','RESEARCHERS']::text[]
);
--> statement-breakpoint
CREATE INDEX projects_public_activity_idx ON projects(last_activity_at DESC) WHERE visibility='PUBLIC';
--> statement-breakpoint
CREATE INDEX projects_public_created_idx ON projects(created_at DESC) WHERE visibility='PUBLIC';
--> statement-breakpoint
CREATE TABLE project_follows (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id,user_id)
);
--> statement-breakpoint
CREATE INDEX project_follows_project_created_idx ON project_follows(project_id,created_at DESC);
--> statement-breakpoint
CREATE INDEX project_follows_user_created_idx ON project_follows(user_id,created_at DESC);
--> statement-breakpoint
CREATE TABLE project_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (char_length(role) BETWEEN 2 AND 60),
  status text NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED','ACCEPTED','DECLINED','REMOVED','LEFT')),
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id,user_id)
);
--> statement-breakpoint
CREATE INDEX project_contributors_user_status_idx ON project_contributors(user_id,status);
--> statement-breakpoint
CREATE INDEX project_contributors_project_status_idx ON project_contributors(project_id,status);
--> statement-breakpoint
CREATE TABLE project_build_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 4000),
  logged_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  moderated_at timestamptz
);
--> statement-breakpoint
CREATE INDEX project_build_logs_project_idx ON project_build_logs(project_id,logged_on DESC,created_at DESC)
  WHERE deleted_at IS NULL AND moderated_at IS NULL;
--> statement-breakpoint
CREATE INDEX project_build_logs_author_created_idx ON project_build_logs(author_id,created_at DESC);
--> statement-breakpoint
CREATE TABLE work_vouches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship text NOT NULL CHECK (relationship IN ('COLLABORATOR','CLIENT','COWORKER','OPEN_SOURCE','MANAGER','OTHER')),
  context_type text NOT NULL DEFAULT 'NONE' CHECK (context_type IN ('NONE','PROJECT','ORGANIZATION')),
  context_id uuid,
  worked_together_year smallint NOT NULL CHECK (worked_together_year BETWEEN 1970 AND 2100),
  skills text[] NOT NULL CHECK (cardinality(skills) BETWEEN 1 AND 6),
  statement text NOT NULL CHECK (char_length(statement) BETWEEN 40 AND 1200),
  visibility text NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC','MEMBERS','PRIVATE')),
  verification_evidence jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(verification_evidence)='array'),
  verification_level text NOT NULL DEFAULT 'STANDARD' CHECK (verification_level IN ('STANDARD','CONTEXT_VERIFIED','ORGANIZATION_VERIFIED','CONTRIBUTION_VERIFIED')),
  reciprocal_signal_at timestamptz,
  hidden_by_recipient_at timestamptz,
  moderation_state text NOT NULL DEFAULT 'ACTIVE' CHECK (moderation_state IN ('ACTIVE','UNDER_REVIEW','REMOVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  revoked_at timestamptz,
  CHECK (author_id <> recipient_id),
  CHECK ((context_type='NONE' AND context_id IS NULL) OR (context_type<>'NONE' AND context_id IS NOT NULL))
);
--> statement-breakpoint
-- Duplicate guard: one live vouch per author and recipient. Authors edit instead of re-vouching.
CREATE UNIQUE INDEX work_vouches_live_pair_idx ON work_vouches(author_id,recipient_id) WHERE revoked_at IS NULL;
--> statement-breakpoint
CREATE INDEX work_vouches_recipient_idx ON work_vouches(recipient_id,created_at DESC) WHERE revoked_at IS NULL;
--> statement-breakpoint
CREATE INDEX work_vouches_author_created_idx ON work_vouches(author_id,created_at DESC);
--> statement-breakpoint
CREATE INDEX work_vouches_skills_idx ON work_vouches USING gin(skills);
--> statement-breakpoint
CREATE INDEX work_vouches_context_idx ON work_vouches(context_type,context_id) WHERE context_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE work_vouch_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vouch_id uuid NOT NULL REFERENCES work_vouches(id) ON DELETE CASCADE,
  editor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  change text NOT NULL CHECK (change IN ('CREATED','EDITED','REVOKED','HIDDEN','UNHIDDEN','MODERATED')),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX work_vouch_revisions_vouch_idx ON work_vouch_revisions(vouch_id,created_at DESC);
--> statement-breakpoint
CREATE TABLE activity_point_revocations (
  resource_type text NOT NULL CHECK (resource_type IN ('POST','COMMENT','BUILD_LOG')),
  resource_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 300),
  revoked_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (resource_type,resource_id)
);
--> statement-breakpoint
CREATE TABLE opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,96}[a-z0-9]$'),
  poster_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('JOB','CONTRACT','OPEN_SOURCE','RFP','GRANT','BOUNTY','RESEARCH','COFOUNDER','VOLUNTEER','HACKATHON','REQUEST_FOR_SOFTWARE')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 6 AND 120),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 20 AND 280),
  description text NOT NULL CHECK (char_length(description) BETWEEN 40 AND 8000),
  looking_for text NOT NULL CHECK (char_length(looking_for) BETWEEN 3 AND 400),
  budget_min integer CHECK (budget_min IS NULL OR budget_min >= 0),
  budget_max integer CHECK (budget_max IS NULL OR budget_max >= 0),
  budget_currency char(3) NOT NULL DEFAULT 'USD' CHECK (budget_currency ~ '^[A-Z]{3}$'),
  deadline date,
  location text CHECK (location IS NULL OR char_length(location) <= 120),
  remote boolean NOT NULL DEFAULT true,
  proposals_open boolean NOT NULL DEFAULT true,
  tags text[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 10),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','FILLED','WITHDRAWN')),
  moderation_state text NOT NULL DEFAULT 'ACTIVE' CHECK (moderation_state IN ('ACTIVE','UNDER_REVIEW','REMOVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min)
);
--> statement-breakpoint
CREATE INDEX opportunities_open_idx ON opportunities(created_at DESC) WHERE status='OPEN' AND moderation_state='ACTIVE';
--> statement-breakpoint
CREATE INDEX opportunities_poster_idx ON opportunities(poster_id,created_at DESC);
--> statement-breakpoint
CREATE INDEX opportunities_project_idx ON opportunities(project_id) WHERE project_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE opportunity_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  proposer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) BETWEEN 80 AND 4000),
  proposed_budget integer CHECK (proposed_budget IS NULL OR proposed_budget >= 0),
  timeline text CHECK (timeline IS NULL OR char_length(timeline) <= 200),
  portfolio_url text CHECK (portfolio_url IS NULL OR (portfolio_url ~ '^https://' AND char_length(portfolio_url) <= 500)),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','SHORTLISTED','DECLINED','ACCEPTED','WITHDRAWN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id,proposer_id)
);
--> statement-breakpoint
CREATE INDEX opportunity_proposals_opportunity_idx ON opportunity_proposals(opportunity_id,created_at DESC);
--> statement-breakpoint
CREATE INDEX opportunity_proposals_proposer_idx ON opportunity_proposals(proposer_id,created_at DESC);
--> statement-breakpoint
ALTER TABLE member_notifications DROP CONSTRAINT member_notifications_category_check;
--> statement-breakpoint
ALTER TABLE member_notifications
  ADD CONSTRAINT member_notifications_category_check
  CHECK (category IN ('DAILY_GAME','JOB_APPLICATION','BUILD_IN_PUBLIC'));
