CREATE TABLE interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_user_id uuid NOT NULL REFERENCES users(id),
  target_user_id uuid NOT NULL REFERENCES users(id),
  interaction_type text NOT NULL,
  weight numeric(8,3) NOT NULL CHECK(weight >= 0),
  resource_type text,
  resource_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(source_user_id <> target_user_id)
);
--> statement-breakpoint
CREATE INDEX interaction_events_source_target_created_idx ON interaction_events(source_user_id,target_user_id,created_at DESC);
--> statement-breakpoint
CREATE TABLE interaction_edges (
  source_user_id uuid NOT NULL REFERENCES users(id),
  target_user_id uuid NOT NULL REFERENCES users(id),
  total_weight numeric(12,3) NOT NULL DEFAULT 0, recent_weight numeric(12,3) NOT NULL DEFAULT 0, last_interaction_at timestamptz NOT NULL DEFAULT now(), interaction_types jsonb NOT NULL DEFAULT '[]'::jsonb, updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(source_user_id,target_user_id), CHECK(source_user_id <> target_user_id)
);
--> statement-breakpoint
CREATE TABLE recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id), entity_type text NOT NULL, entity_id uuid NOT NULL, feedback text NOT NULL CHECK(feedback IN ('DISMISSED','NOT_INTERESTED','ALREADY_KNOW','DO_NOT_SUGGEST')), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,entity_type,entity_id)
);
--> statement-breakpoint
CREATE INDEX recommendation_feedback_user_idx ON recommendation_feedback(user_id,entity_type);
--> statement-breakpoint
