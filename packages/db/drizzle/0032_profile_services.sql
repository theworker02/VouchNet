ALTER TABLE profiles
  ADD COLUMN hourly_rate_amount numeric(10,2),
  ADD COLUMN hourly_rate_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN rate_visible boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- Services a member offers, with optional published rates. The basis for formal hire requests.
CREATE TABLE profile_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  description text,
  rate_amount numeric(10,2),
  rate_currency text NOT NULL DEFAULT 'USD',
  rate_unit text NOT NULL DEFAULT 'HOURLY' CHECK (rate_unit IN ('HOURLY','FIXED','STARTING_AT')),
  active boolean NOT NULL DEFAULT true,
  display_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX profile_services_user_active ON profile_services(user_id) WHERE active;
--> statement-breakpoint

-- Formal contact requests directed at a member's services. Replaces cold outreach.
CREATE TABLE service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES profile_services(id) ON DELETE SET NULL,
  provider_user_id uuid NOT NULL REFERENCES users(id),
  requester_user_id uuid NOT NULL REFERENCES users(id),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACCEPTED','DECLINED','WITHDRAWN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (provider_user_id <> requester_user_id)
);
--> statement-breakpoint
CREATE INDEX service_requests_provider ON service_requests(provider_user_id,status);
CREATE INDEX service_requests_requester ON service_requests(requester_user_id);
