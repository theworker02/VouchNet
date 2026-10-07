CREATE TABLE post_comment_reactions (
  comment_id uuid NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
--> statement-breakpoint
CREATE INDEX post_comment_reactions_comment_idx ON post_comment_reactions(comment_id);
