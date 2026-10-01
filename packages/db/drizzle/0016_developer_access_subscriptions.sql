CREATE TABLE developer_access_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status subscription_status NOT NULL DEFAULT 'ACTIVE',
  provider_customer_id text UNIQUE,
  provider_subscription_id text UNIQUE,
  current_period_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
