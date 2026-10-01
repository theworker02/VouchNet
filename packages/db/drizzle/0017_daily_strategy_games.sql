CREATE TABLE daily_strategy_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_date date NOT NULL,
  difficulty smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 6),
  move_count smallint NOT NULL CHECK (move_count BETWEEN 0 AND 64),
  elapsed_ms integer NOT NULL CHECK (elapsed_ms BETWEEN 0 AND 1800000),
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,game_date)
);
--> statement-breakpoint
CREATE INDEX daily_strategy_runs_user_completed_idx
  ON daily_strategy_runs(user_id,completed_at DESC);
--> statement-breakpoint
CREATE TABLE member_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('DAILY_GAME')),
  resource_key text NOT NULL CHECK (char_length(resource_key) BETWEEN 1 AND 128),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  href text NOT NULL CHECK (href LIKE '/%'),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,category,resource_key)
);
--> statement-breakpoint
CREATE INDEX member_notifications_inbox_idx
  ON member_notifications(user_id,read_at,created_at DESC);
