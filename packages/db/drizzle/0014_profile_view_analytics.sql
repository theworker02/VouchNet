-- Analytics queries intentionally use a 90-day window. Search terms and network/IP fingerprints
-- are not collected without a separate privacy design and retention job.
CREATE TABLE profile_view_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'DIRECT' CHECK (source IN ('DIRECT','SEARCH','NETWORK')),
  viewed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (viewer_user_id IS NULL OR viewer_user_id <> profile_user_id)
);
--> statement-breakpoint
CREATE INDEX profile_view_events_profile_recent_idx
  ON profile_view_events(profile_user_id,viewed_at DESC);
--> statement-breakpoint
CREATE INDEX profile_view_events_viewer_recent_idx
  ON profile_view_events(viewer_user_id,viewed_at DESC)
  WHERE viewer_user_id IS NOT NULL;
