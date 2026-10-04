import 'server-only';

import { createSqlClient } from '@nexus/db';

export type ConversationSummary = {
  id: string;
  counterpart: { id: string; slug: string; fullName: string; headline: string | null };
  lastMessage: { body: string; createdAt: Date; senderId: string } | null;
  unreadCount: number;
  muted: boolean;
};

export type ConversationMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  replyToMessageId: string | null;
  seenAt: Date | null;
  attachments: MessageAttachment[];
};

export type MessageAttachment = {
  id: string;
  url: string;
  kind: 'IMAGE' | 'LINK' | 'DOCUMENT' | 'PORTFOLIO';
  label: string | null;
  altText: string | null;
};

function sql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(databaseUrl);
}

async function assertMember(
  client: ReturnType<typeof createSqlClient>,
  userId: string,
  conversationId: string,
) {
  const memberships = await client<{ conversation_id: string }[]>`
    SELECT conversation_id FROM conversation_members
    WHERE conversation_id=${conversationId} AND user_id=${userId} AND left_at IS NULL
  `;
  if (memberships[0] === undefined) throw new Error('CONVERSATION_NOT_FOUND');
}

/** A direct thread requires an accepted connection and respects either member's block list. */
export async function openDirectConversation(
  userId: string,
  counterpartId: string,
): Promise<{ id: string }> {
  if (userId === counterpartId) throw new Error('SELF_CONVERSATION_FORBIDDEN');
  const [low, high] = userId < counterpartId ? [userId, counterpartId] : [counterpartId, userId];
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const allowed = await transaction<{ id: string }[]>`
        SELECT c.id FROM connections c
        WHERE c.pair_low_id=${low} AND c.pair_high_id=${high} AND c.state='ACCEPTED'
          AND NOT EXISTS (
            SELECT 1 FROM blocks b
            WHERE (b.blocker_id=${userId} AND b.blocked_id=${counterpartId})
              OR (b.blocker_id=${counterpartId} AND b.blocked_id=${userId})
          )
      `;
      if (allowed[0] === undefined) throw new Error('DIRECT_MESSAGE_NOT_PERMITTED');
      const conversations = await transaction<{ id: string }[]>`
        INSERT INTO conversations (kind,direct_pair_low_id,direct_pair_high_id)
        VALUES ('DIRECT',${low},${high})
        ON CONFLICT (direct_pair_low_id,direct_pair_high_id) WHERE kind='DIRECT'
        DO UPDATE SET updated_at=conversations.updated_at
        RETURNING id
      `;
      const conversation = conversations[0];
      if (conversation === undefined) throw new Error('CONVERSATION_CREATE_FAILED');
      await transaction`
        INSERT INTO conversation_members (conversation_id,user_id)
        VALUES (${conversation.id},${low}),(${conversation.id},${high})
        ON CONFLICT (conversation_id,user_id) DO UPDATE SET left_at=NULL
      `;
      return conversation;
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const client = sql();
  try {
    return await client<ConversationSummary[]>`
      SELECT c.id,
        json_build_object(
          'id', other.user_id,
          'slug', p.slug,
          'fullName', concat(p.first_name,' ',p.last_name),
          'headline', p.headline
        ) AS counterpart,
        (
          SELECT json_build_object('body',m.body,'createdAt',m.created_at,'senderId',m.sender_id)
          FROM direct_messages m WHERE m.conversation_id=c.id AND m.deleted_at IS NULL
          ORDER BY m.created_at DESC LIMIT 1
        ) AS "lastMessage",
        (
          SELECT count(*)::int FROM direct_messages m
          WHERE m.conversation_id=c.id AND m.sender_id<>${userId} AND m.deleted_at IS NULL
            AND (member.last_read_at IS NULL OR m.created_at>member.last_read_at)
        ) AS "unreadCount",
        (member.muted_at IS NOT NULL) AS muted
      FROM conversations c
      JOIN conversation_members member ON member.conversation_id=c.id AND member.user_id=${userId} AND member.left_at IS NULL
      JOIN conversation_members other ON other.conversation_id=c.id AND other.user_id<>${userId} AND other.left_at IS NULL
      JOIN profiles p ON p.user_id=other.user_id
      WHERE c.kind='DIRECT'
      ORDER BY COALESCE((SELECT max(m.created_at) FROM direct_messages m WHERE m.conversation_id=c.id),c.created_at) DESC
      LIMIT 100
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function getConversationMessages(
  userId: string,
  conversationId: string,
): Promise<ConversationMessage[]> {
  const client = sql();
  try {
    await assertMember(client, userId, conversationId);
    const messages = await client<ConversationMessage[]>`
      SELECT m.id,m.sender_id AS "senderId",concat(p.first_name,' ',p.last_name) AS "senderName",
        m.body,m.created_at AS "createdAt",m.edited_at AS "editedAt",m.reply_to_message_id AS "replyToMessageId",
        CASE WHEN m.sender_id=${userId} THEN (
          SELECT cm.last_read_at FROM conversation_members cm
          WHERE cm.conversation_id=${conversationId} AND cm.user_id<>${userId}
            AND cm.left_at IS NULL AND cm.last_read_at>=m.created_at
          ORDER BY cm.last_read_at DESC LIMIT 1
        ) ELSE NULL END AS "seenAt",
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id',a.id,'url',a.url,'kind',a.kind,'label',a.label,'altText',a.alt_text
          ) ORDER BY a.created_at)
          FROM message_attachments a WHERE a.message_id=m.id
        ),'[]'::jsonb) AS attachments
      FROM direct_messages m JOIN profiles p ON p.user_id=m.sender_id
      WHERE m.conversation_id=${conversationId} AND m.deleted_at IS NULL
      ORDER BY m.created_at ASC LIMIT 200
    `;
    await client`
      UPDATE conversation_members SET last_read_at=now()
      WHERE conversation_id=${conversationId} AND user_id=${userId} AND left_at IS NULL
    `;
    return messages;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  input: {
    body: string;
    replyToMessageId?: string | undefined;
    attachments: Omit<MessageAttachment, 'id'>[];
  },
): Promise<ConversationMessage> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const membership = await transaction<{ conversation_id: string }[]>`
        SELECT conversation_id FROM conversation_members
        WHERE conversation_id=${conversationId} AND user_id=${userId} AND left_at IS NULL
      `;
      if (membership[0] === undefined) throw new Error('CONVERSATION_NOT_FOUND');
      const recipients = await transaction<{ user_id: string }[]>`
        SELECT user_id FROM conversation_members
        WHERE conversation_id=${conversationId} AND user_id<>${userId} AND left_at IS NULL
      `;
      const blocked = await transaction<{ blocker_id: string }[]>`
        SELECT blocker_id FROM blocks WHERE blocker_id IN (${userId},${recipients[0]?.user_id ?? userId})
          AND ((blocker_id=${userId} AND blocked_id=${recipients[0]?.user_id ?? userId})
            OR (blocker_id=${recipients[0]?.user_id ?? userId} AND blocked_id=${userId}))
      `;
      if (blocked[0] !== undefined) throw new Error('MESSAGE_NOT_PERMITTED');
      if (input.replyToMessageId !== undefined) {
        const replyTarget = await transaction<{ id: string }[]>`
          SELECT id FROM direct_messages
          WHERE id=${input.replyToMessageId} AND conversation_id=${conversationId} AND deleted_at IS NULL
        `;
        if (replyTarget[0] === undefined) throw new Error('REPLY_TARGET_NOT_FOUND');
      }
      const messages = await transaction<ConversationMessage[]>`
        INSERT INTO direct_messages (conversation_id,sender_id,body,reply_to_message_id)
        SELECT ${conversationId},${userId},${input.body},${input.replyToMessageId ?? null}
        WHERE EXISTS (
          SELECT 1 FROM conversation_members
          WHERE conversation_id=${conversationId} AND user_id=${userId} AND left_at IS NULL
        )
        RETURNING id,sender_id AS "senderId",''::text AS "senderName",body,
          created_at AS "createdAt",edited_at AS "editedAt",reply_to_message_id AS "replyToMessageId",
          NULL::timestamptz AS "seenAt",'[]'::jsonb AS attachments
      `;
      const message = messages[0];
      if (message === undefined) throw new Error('MESSAGE_CREATE_FAILED');
      const names = await transaction<{ full_name: string }[]>`
        SELECT concat(first_name,' ',last_name) AS full_name FROM profiles WHERE user_id=${userId}
      `;
      const attachments: MessageAttachment[] = [];
      for (const attachment of input.attachments) {
        const rows = await transaction<MessageAttachment[]>`
          INSERT INTO message_attachments (message_id,url,kind,label,alt_text)
          VALUES (${message.id},${attachment.url},${attachment.kind},${attachment.label},${attachment.altText})
          RETURNING id,url,kind,label,alt_text AS "altText"
        `;
        const created = rows[0];
        if (created !== undefined) attachments.push(created);
      }
      await transaction`UPDATE conversations SET updated_at=now() WHERE id=${conversationId}`;
      return {
        ...message,
        attachments,
        senderName: names[0]?.full_name ?? 'VouchNet member',
      };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function setConversationMuted(userId: string, conversationId: string, muted: boolean) {
  const client = sql();
  try {
    await assertMember(client, userId, conversationId);
    await client`
      UPDATE conversation_members SET muted_at=${muted ? new Date() : null}
      WHERE conversation_id=${conversationId} AND user_id=${userId} AND left_at IS NULL
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}
