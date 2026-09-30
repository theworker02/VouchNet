CREATE TYPE subscription_tier AS ENUM ('FREE','PLUS');
--> statement-breakpoint
CREATE TYPE subscription_status AS ENUM ('ACTIVE','PAST_DUE','CANCELED','EXPIRED');
--> statement-breakpoint
CREATE TABLE user_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'FREE',
  status subscription_status NOT NULL DEFAULT 'ACTIVE',
  monthly_price_cents integer NOT NULL DEFAULT 0 CHECK (monthly_price_cents >= 0),
  provider_customer_id text UNIQUE,
  provider_subscription_id text UNIQUE,
  current_period_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((tier='FREE' AND monthly_price_cents=0) OR (tier='PLUS' AND monthly_price_cents=455))
);
--> statement-breakpoint
CREATE TABLE profile_featured_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  external_url text,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 120),
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((project_id IS NOT NULL AND external_url IS NULL) OR (project_id IS NULL AND external_url IS NOT NULL)),
  UNIQUE(user_id,position)
);
--> statement-breakpoint
CREATE INDEX profile_featured_nodes_user_idx ON profile_featured_nodes(user_id,position);
--> statement-breakpoint
CREATE TABLE priority_outreach_credits (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  used_count smallint NOT NULL DEFAULT 0 CHECK (used_count BETWEEN 0 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,period_start)
);
