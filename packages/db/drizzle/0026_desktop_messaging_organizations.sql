-- Shared network primitives used by both VouchNet Web and VouchNet Desktop.
-- A direct conversation is keyed by its normalized participant pair, preventing duplicate
-- threads during concurrent creates. Message bodies remain private to participants.
CREATE TABLE organization_members (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('OWNER','ADMIN','EDITOR','RECRUITER','MEMBER')),
  employment_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
--> statement-breakpoint
CREATE INDEX organization_members_user_role_idx ON organization_members(user_id, role);
--> statement-breakpoint
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'DIRECT' CHECK (kind IN ('DIRECT','GROUP','ORGANIZATION')),
  direct_pair_low_id uuid REFERENCES users(id) ON DELETE CASCADE,
  direct_pair_high_id uuid REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'DIRECT' AND direct_pair_low_id IS NOT NULL AND direct_pair_high_id IS NOT NULL
      AND direct_pair_low_id <> direct_pair_high_id AND organization_id IS NULL)
    OR (kind <> 'DIRECT' AND direct_pair_low_id IS NULL AND direct_pair_high_id IS NULL)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX conversations_direct_pair_idx
  ON conversations(direct_pair_low_id, direct_pair_high_id) WHERE kind = 'DIRECT';
--> statement-breakpoint
CREATE TABLE conversation_members (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  muted_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);
--> statement-breakpoint
CREATE INDEX conversation_members_user_active_idx
  ON conversation_members(user_id, conversation_id) WHERE left_at IS NULL;
--> statement-breakpoint
CREATE TABLE direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 12000),
  reply_to_message_id uuid REFERENCES direct_messages(id) ON DELETE SET NULL,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX direct_messages_conversation_created_idx
  ON direct_messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE TABLE message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  url text NOT NULL CHECK (url ~ '^https://'),
  kind text NOT NULL CHECK (kind IN ('IMAGE','LINK','DOCUMENT','PORTFOLIO')),
  label text CHECK (label IS NULL OR char_length(label) BETWEEN 1 AND 180),
  alt_text text CHECK (alt_text IS NULL OR char_length(alt_text) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX message_attachments_message_idx ON message_attachments(message_id, created_at);
--> statement-breakpoint
CREATE TABLE message_reactions (
  message_id uuid NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('LIKE','LOVE','INSIGHTFUL','THANKS')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, reaction_type)
);
--> statement-breakpoint
CREATE INDEX message_reactions_message_idx ON message_reactions(message_id);
