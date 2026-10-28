-- Member-owned saved posts. Visibility and block rules are re-checked on every read so a save
-- cannot become a permanent bypass of the author's audience or a block relationship.
CREATE TABLE saved_posts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
--> statement-breakpoint
CREATE INDEX saved_posts_user_created_idx ON saved_posts(user_id, created_at DESC);
