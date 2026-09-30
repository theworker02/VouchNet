CREATE TYPE post_visibility AS ENUM ('PUBLIC','MEMBERS','FOLLOWERS','CONTACTS','PRIVATE');
--> statement-breakpoint
CREATE TYPE post_feed_category AS ENUM ('TECHNICAL','PROJECT','HIRING','STATUS','OPINION');
--> statement-breakpoint
CREATE TYPE post_status AS ENUM ('DRAFT','PUBLISHED','DELETED');
--> statement-breakpoint
CREATE TYPE post_reaction_type AS ENUM ('UPVOTE','VERIFY','INSIGHTFUL','BENCHMARK');
--> statement-breakpoint
CREATE TYPE mention_target_type AS ENUM ('USER','ORGANIZATION','PROJECT');
--> statement-breakpoint
CREATE TYPE notification_category AS ENUM ('MENTION','APPLICATION','PEER_ENDORSEMENT','SYSTEM');
--> statement-breakpoint

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id),
  body_markdown text NOT NULL CHECK (char_length(trim(body_markdown)) BETWEEN 1 AND 12000),
  code_snippets jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(code_snippets) = 'array'),
  media_urls jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(media_urls) = 'array'),
  feed_category post_feed_category NOT NULL DEFAULT 'TECHNICAL',
  visibility post_visibility NOT NULL DEFAULT 'PUBLIC',
  status post_status NOT NULL DEFAULT 'PUBLISHED',
  quote_post_id uuid REFERENCES posts(id),
  published_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (quote_post_id IS NULL OR char_length(trim(body_markdown)) >= 80)
);
--> statement-breakpoint
CREATE INDEX posts_author_created_idx ON posts(author_id, created_at DESC) WHERE status = 'PUBLISHED';
--> statement-breakpoint
CREATE INDEX posts_feed_created_idx ON posts(feed_category, created_at DESC) WHERE status = 'PUBLISHED';
--> statement-breakpoint

CREATE TABLE post_mentions (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  target_type mention_target_type NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, target_type, target_id)
);
--> statement-breakpoint
CREATE INDEX post_mentions_target_idx ON post_mentions(target_type, target_id, created_at DESC);
--> statement-breakpoint

CREATE TABLE post_reactions (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  reaction_type post_reaction_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
--> statement-breakpoint
CREATE INDEX post_reactions_post_type_idx ON post_reactions(post_id, reaction_type);
--> statement-breakpoint

CREATE TABLE post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id),
  body_markdown text NOT NULL CHECK (char_length(trim(body_markdown)) BETWEEN 1 AND 4000),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX post_comments_post_created_idx ON post_comments(post_id, created_at ASC) WHERE deleted_at IS NULL;
--> statement-breakpoint

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES users(id),
  actor_id uuid REFERENCES users(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  category notification_category NOT NULL,
  aggregation_key text NOT NULL,
  aggregated_count integer NOT NULL DEFAULT 1 CHECK (aggregated_count > 0),
  first_occurred_at timestamptz NOT NULL DEFAULT now(),
  last_occurred_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX notifications_recipient_inbox_idx ON notifications(recipient_id, read_at, last_occurred_at DESC);
--> statement-breakpoint
CREATE UNIQUE INDEX notifications_unread_aggregation_idx ON notifications(recipient_id, aggregation_key) WHERE read_at IS NULL;
--> statement-breakpoint
