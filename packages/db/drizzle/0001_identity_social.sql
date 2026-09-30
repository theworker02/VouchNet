CREATE TYPE user_status AS ENUM ('PENDING_VERIFICATION','ACTIVE','RESTRICTED','SUSPENDED','DEACTIVATED','DELETED');
--> statement-breakpoint
CREATE TYPE profile_visibility AS ENUM ('PUBLIC','MEMBERS','CONNECTIONS','PRIVATE');
--> statement-breakpoint
CREATE TYPE connection_state AS ENUM ('PENDING','ACCEPTED','DECLINED','WITHDRAWN','REMOVED','BLOCKED');
--> statement-breakpoint
CREATE TYPE project_visibility AS ENUM ('PUBLIC','MEMBERS','CONNECTIONS','PRIVATE');
--> statement-breakpoint
CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_type text NOT NULL DEFAULT 'HUMAN' CHECK (account_type='HUMAN'), status user_status NOT NULL DEFAULT 'PENDING_VERIFICATION', role text NOT NULL DEFAULT 'USER', password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deactivated_at timestamptz, deleted_at timestamptz);
--> statement-breakpoint
CREATE TABLE user_emails (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), email_normalized text NOT NULL UNIQUE, verified_at timestamptz, is_primary boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE UNIQUE INDEX user_emails_one_primary_idx ON user_emails(user_id) WHERE is_primary;
--> statement-breakpoint
CREATE TABLE profiles (user_id uuid PRIMARY KEY REFERENCES users(id), slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'), first_name text NOT NULL, last_name text NOT NULL, headline text, about text, location text, avatar_key text, cover_key text, visibility profile_visibility NOT NULL DEFAULT 'PUBLIC', onboarding_step smallint NOT NULL DEFAULT 0 CHECK (onboarding_step BETWEEN 0 AND 10), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, last_active_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, user_agent text, created_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE email_verifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE password_resets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE terms_acceptances (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), document_type text NOT NULL, document_version text NOT NULL, accepted_at timestamptz NOT NULL DEFAULT now(), ip_hash text, UNIQUE(user_id,document_type,document_version));
--> statement-breakpoint
CREATE TABLE privacy_settings (user_id uuid PRIMARY KEY REFERENCES users(id), connection_requests text NOT NULL DEFAULT 'EVERYONE', message_permissions text NOT NULL DEFAULT 'CONNECTIONS', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE skills (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, slug text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE user_skills (user_id uuid REFERENCES users(id), skill_id uuid REFERENCES skills(id), proficiency text, years_experience smallint CHECK(years_experience >= 0), featured boolean NOT NULL DEFAULT false, display_order smallint NOT NULL DEFAULT 0, PRIMARY KEY(user_id, skill_id));
--> statement-breakpoint
CREATE TABLE experiences (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), title text NOT NULL, organization text NOT NULL, employment_type text NOT NULL, location text, location_type text, start_month smallint CHECK(start_month BETWEEN 1 AND 12), start_year smallint NOT NULL, end_month smallint CHECK(end_month BETWEEN 1 AND 12), end_year smallint, is_current boolean NOT NULL DEFAULT false, description text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE education (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), institution text NOT NULL, degree text, field_of_study text, start_year smallint, end_year smallint, grade text, activities text, description text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE certifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), name text NOT NULL, issuing_organization text NOT NULL, issue_date date, expiration_date date, credential_id text, credential_url text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id), slug text NOT NULL UNIQUE, name text NOT NULL, summary text, description text, status text NOT NULL DEFAULT 'IDEA', visibility project_visibility NOT NULL DEFAULT 'PUBLIC', project_url text, repository_url text, documentation_url text, demo_url text, cover_key text, ongoing boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE professional_links (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), link_type text NOT NULL, label text NOT NULL, url text NOT NULL, display_order smallint NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE follows (follower_id uuid REFERENCES users(id), followed_id uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(follower_id, followed_id), CHECK(follower_id <> followed_id));
--> statement-breakpoint
CREATE TABLE connections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), requester_id uuid NOT NULL REFERENCES users(id), recipient_id uuid NOT NULL REFERENCES users(id), pair_low_id uuid NOT NULL REFERENCES users(id), pair_high_id uuid NOT NULL REFERENCES users(id), state connection_state NOT NULL DEFAULT 'PENDING', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(requester_id <> recipient_id), CHECK(pair_low_id <> pair_high_id), UNIQUE(pair_low_id, pair_high_id));
--> statement-breakpoint
CREATE TABLE blocks (blocker_id uuid REFERENCES users(id), blocked_id uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(blocker_id, blocked_id), CHECK(blocker_id <> blocked_id));
--> statement-breakpoint
CREATE INDEX profiles_slug_idx ON profiles(slug);
--> statement-breakpoint CREATE INDEX follows_followed_idx ON follows(followed_id);
--> statement-breakpoint CREATE INDEX connections_recipient_state_idx ON connections(recipient_id,state);
--> statement-breakpoint CREATE INDEX experiences_user_idx ON experiences(user_id);
--> statement-breakpoint CREATE INDEX education_user_idx ON education(user_id);
--> statement-breakpoint CREATE INDEX projects_owner_idx ON projects(owner_id);
--> statement-breakpoint
