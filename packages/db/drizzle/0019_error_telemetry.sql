CREATE TABLE error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  error_name text NOT NULL CHECK (char_length(error_name) BETWEEN 1 AND 160),
  error_message text NOT NULL CHECK (char_length(error_message) BETWEEN 1 AND 4000),
  stack_trace text,
  component_stack text,
  route text NOT NULL CHECK (route LIKE '/%' AND char_length(route) <= 512),
  user_agent text,
  severity text NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text NOT NULL DEFAULT 'UNRESOLVED' CHECK (status IN ('UNRESOLVED','TRIAGED','RESOLVED','IGNORED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX error_events_triage_idx ON error_events(status,severity,created_at DESC);
--> statement-breakpoint
CREATE INDEX error_events_route_created_idx ON error_events(route,created_at DESC);
