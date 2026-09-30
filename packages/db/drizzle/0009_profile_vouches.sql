CREATE TABLE profile_vouches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES users(id),
  recipient_id uuid NOT NULL REFERENCES users(id),
  kind text NOT NULL CHECK (kind IN ('RELIABLE','HELPFUL','COLLABORATIVE','EXCEPTIONAL')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (voucher_id <> recipient_id),
  UNIQUE (voucher_id, recipient_id)
);
--> statement-breakpoint
CREATE INDEX profile_vouches_recipient_created_idx ON profile_vouches(recipient_id,created_at DESC);
--> statement-breakpoint
CREATE INDEX profile_vouches_voucher_created_idx ON profile_vouches(voucher_id,created_at DESC);
