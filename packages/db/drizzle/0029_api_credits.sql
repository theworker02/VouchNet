CREATE TYPE api_credit_entry_kind AS ENUM ('TOP_UP','USAGE','ADJUSTMENT');
--> statement-breakpoint
CREATE TABLE api_credit_balances (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_credits integer NOT NULL DEFAULT 0 CHECK (balance_credits >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE api_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind api_credit_entry_kind NOT NULL,
  credits_delta integer NOT NULL CHECK (credits_delta <> 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  amount_cents integer CHECK (amount_cents IS NULL OR amount_cents > 0),
  currency text CHECK (currency IS NULL OR currency = 'usd'),
  operation text CHECK (operation IS NULL OR char_length(operation) BETWEEN 1 AND 64),
  developer_client_id uuid REFERENCES developer_clients(id) ON DELETE SET NULL,
  provider_reference text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'TOP_UP' AND credits_delta > 0 AND provider_reference IS NOT NULL AND amount_cents IS NOT NULL AND currency IS NOT NULL)
    OR (kind = 'USAGE' AND credits_delta < 0 AND operation IS NOT NULL AND provider_reference IS NULL)
    OR kind = 'ADJUSTMENT'
  )
);
--> statement-breakpoint
CREATE INDEX api_credit_ledger_user_created_idx ON api_credit_ledger(user_id,created_at DESC);
--> statement-breakpoint
CREATE INDEX api_credit_ledger_usage_window_idx ON api_credit_ledger(user_id,created_at) WHERE kind = 'USAGE';
