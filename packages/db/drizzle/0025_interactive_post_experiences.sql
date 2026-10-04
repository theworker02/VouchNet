-- Experiences are authored programs, so they are deliberately persisted separately
-- from ordinary post text. The renderer must only execute ACTIVE experiences inside
-- the isolated runtime; disabling one leaves the surrounding post available for review.
CREATE TYPE post_content_type AS ENUM ('TEXT','IMAGE','VIDEO','DOCUMENT','INTERACTIVE');
--> statement-breakpoint
ALTER TABLE posts
  ADD COLUMN post_type post_content_type NOT NULL DEFAULT 'TEXT',
  ADD COLUMN interactive_content jsonb,
  ADD COLUMN interactive_status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (interactive_status IN ('ACTIVE','DISABLED'));
--> statement-breakpoint
ALTER TABLE posts
  ADD CONSTRAINT posts_interactive_content_shape_check CHECK (
    (post_type = 'INTERACTIVE' AND interactive_content IS NOT NULL AND jsonb_typeof(interactive_content) = 'object')
    OR (post_type <> 'INTERACTIVE' AND interactive_content IS NULL)
  );
--> statement-breakpoint
CREATE INDEX posts_active_interactive_created_idx
  ON posts(created_at DESC)
  WHERE post_type = 'INTERACTIVE' AND interactive_status = 'ACTIVE' AND status = 'PUBLISHED';
