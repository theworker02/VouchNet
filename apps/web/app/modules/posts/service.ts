import { createSqlClient } from '@nexus/db';
import { getUserSettings } from '../../lib/settings';
import { hasVouchNetPlus } from '../../lib/subscription';

export const postCategories = ['TECHNICAL', 'PROJECT', 'HIRING', 'STATUS', 'OPINION'] as const;
export type PostCategory = (typeof postCategories)[number];
export const postVisibilities = ['PUBLIC', 'MEMBERS', 'FOLLOWERS', 'CONTACTS', 'PRIVATE'] as const;
export type PostVisibility = (typeof postVisibilities)[number];
export const reactionTypes = ['UPVOTE', 'VERIFY', 'INSIGHTFUL', 'BENCHMARK'] as const;
export type ReactionType = (typeof reactionTypes)[number];

export interface CodeSnippet {
  language: string;
  code: string;
}
export interface CreatePostInput {
  bodyMarkdown: string;
  codeSnippets: CodeSnippet[];
  mediaUrls: string[];
  category: PostCategory;
  visibility: PostVisibility;
  quotePostId?: string | undefined;
  mentionedUserIds: string[];
}
export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorSlug: string;
  authorHeadline: string | null;
  bodyMarkdown: string;
  codeSnippets: CodeSnippet[];
  mediaUrls: string[];
  category: PostCategory;
  visibility: PostVisibility;
  createdAt: Date;
  peerSignal: number;
  reactionCounts: Record<ReactionType, number>;
  commentCount: number;
  viewerReaction: ReactionType | null;
  isPlusAuthor: boolean;
}

function sql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(databaseUrl);
}

export async function createPost(
  authorId: string,
  input: CreatePostInput,
): Promise<{ id: string }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const posts = await transaction<{ id: string }[]>`
        INSERT INTO posts (author_id,body_markdown,code_snippets,media_urls,feed_category,visibility,quote_post_id,published_at)
        VALUES (${authorId},${input.bodyMarkdown},${JSON.stringify(input.codeSnippets)}::jsonb,${JSON.stringify(input.mediaUrls)}::jsonb,${input.category},${input.visibility},${input.quotePostId ?? null},now())
        RETURNING id
      `;
      const post = posts[0];
      if (post === undefined) throw new Error('POST_CREATION_FAILED');
      for (const mentionedUserId of input.mentionedUserIds) {
        const allowed = await transaction<{ id: string }[]>`
          SELECT u.id FROM users u
          WHERE u.id=${mentionedUserId} AND u.status='ACTIVE'
            AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${authorId} AND b.blocked_id=u.id) OR (b.blocker_id=u.id AND b.blocked_id=${authorId}))
        `;
        if (allowed.length === 0) continue;
        await transaction`INSERT INTO post_mentions (post_id,target_type,target_id) VALUES (${post.id},'USER',${mentionedUserId}) ON CONFLICT DO NOTHING`;
        if (mentionedUserId !== authorId)
          await transaction`
          INSERT INTO notifications (recipient_id,actor_id,entity_type,entity_id,category,aggregation_key)
          VALUES (${mentionedUserId},${authorId},'POST',${post.id},'MENTION',${`mention:post:${post.id}`})
          ON CONFLICT (recipient_id,aggregation_key) WHERE read_at IS NULL
          DO UPDATE SET actor_id=EXCLUDED.actor_id,aggregated_count=notifications.aggregated_count + 1,last_occurred_at=now(),updated_at=now()
        `;
      }
      return post;
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function getFeed(
  viewerId: string,
  mode: 'CHRONOLOGICAL' | 'PEER_VERIFIED',
  hiddenCategories: readonly PostCategory[],
): Promise<FeedPost[]> {
  const client = sql();
  try {
    const [settings, isPlus] = await Promise.all([
      getUserSettings(viewerId),
      hasVouchNetPlus(viewerId),
    ]);
    const mutedTerms = isPlus ? settings.preferences.feedMuteKeywords : [];
    const rows = await client<FeedPost[]>`
      SELECT p.id,p.author_id AS "authorId",concat(pr.first_name,' ',pr.last_name) AS "authorName",pr.slug AS "authorSlug",pr.headline AS "authorHeadline",p.body_markdown AS "bodyMarkdown",p.code_snippets AS "codeSnippets",p.media_urls AS "mediaUrls",p.feed_category AS category,p.visibility,p.created_at AS "createdAt",
        EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id=p.author_id AND us.tier='PLUS' AND us.status='ACTIVE' AND (us.current_period_ends_at IS NULL OR us.current_period_ends_at>now())) AS "isPlusAuthor",
        COALESCE((SELECT sum(CASE r.reaction_type WHEN 'VERIFY' THEN 4 WHEN 'BENCHMARK' THEN 3 WHEN 'INSIGHTFUL' THEN 2 ELSE 1 END)::int FROM post_reactions r JOIN connections c ON c.state='ACCEPTED' AND ((c.requester_id=r.user_id AND c.recipient_id=p.author_id) OR (c.recipient_id=r.user_id AND c.requester_id=p.author_id)) WHERE r.post_id=p.id),0) AS "peerSignal",
        (SELECT count(*)::int FROM post_comments pc WHERE pc.post_id=p.id AND pc.deleted_at IS NULL) AS "commentCount",
        (SELECT reaction_type FROM post_reactions vr WHERE vr.post_id=p.id AND vr.user_id=${viewerId}) AS "viewerReaction",
        jsonb_build_object('UPVOTE',(SELECT count(*)::int FROM post_reactions rr WHERE rr.post_id=p.id AND rr.reaction_type='UPVOTE'),'VERIFY',(SELECT count(*)::int FROM post_reactions rr WHERE rr.post_id=p.id AND rr.reaction_type='VERIFY'),'INSIGHTFUL',(SELECT count(*)::int FROM post_reactions rr WHERE rr.post_id=p.id AND rr.reaction_type='INSIGHTFUL'),'BENCHMARK',(SELECT count(*)::int FROM post_reactions rr WHERE rr.post_id=p.id AND rr.reaction_type='BENCHMARK')) AS "reactionCounts"
      FROM posts p JOIN profiles pr ON pr.user_id=p.author_id
      WHERE p.status='PUBLISHED' AND p.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${viewerId} AND b.blocked_id=p.author_id) OR (b.blocker_id=p.author_id AND b.blocked_id=${viewerId}))
        AND (p.author_id=${viewerId} OR p.visibility IN ('PUBLIC','MEMBERS') OR (p.visibility='FOLLOWERS' AND EXISTS (SELECT 1 FROM follows f WHERE f.follower_id=${viewerId} AND f.followed_id=p.author_id)) OR (p.visibility='CONTACTS' AND EXISTS (SELECT 1 FROM connections c WHERE c.state='ACCEPTED' AND ((c.requester_id=${viewerId} AND c.recipient_id=p.author_id) OR (c.recipient_id=${viewerId} AND c.requester_id=p.author_id)))))
      ORDER BY p.created_at DESC LIMIT 100
    `;
    const visible = rows.filter(
      (post) =>
        !hiddenCategories.includes(post.category) &&
        !mutedTerms.some((term) => post.bodyMarkdown.toLocaleLowerCase().includes(term)),
    );
    return mode === 'PEER_VERIFIED'
      ? visible.sort(
          (left, right) =>
            right.peerSignal - left.peerSignal ||
            right.createdAt.getTime() - left.createdAt.getTime(),
        )
      : visible;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function reactToPost(
  actorId: string,
  postId: string,
  reactionType: ReactionType,
): Promise<void> {
  const client = sql();
  try {
    await client.begin(async (transaction) => {
      const posts = await transaction<
        { author_id: string }[]
      >`SELECT author_id FROM posts WHERE id=${postId} AND status='PUBLISHED' AND deleted_at IS NULL`;
      const post = posts[0];
      if (post === undefined) throw new Error('POST_NOT_FOUND');
      if (post.author_id === actorId) throw new Error('SELF_REACTION_FORBIDDEN');
      await transaction`INSERT INTO post_reactions (post_id,user_id,reaction_type) VALUES (${postId},${actorId},${reactionType}) ON CONFLICT (post_id,user_id) DO UPDATE SET reaction_type=EXCLUDED.reaction_type,updated_at=now()`;
      if (reactionType === 'VERIFY' || reactionType === 'BENCHMARK')
        await transaction`
        INSERT INTO notifications (recipient_id,actor_id,entity_type,entity_id,category,aggregation_key)
        VALUES (${post.author_id},${actorId},'POST',${postId},'PEER_ENDORSEMENT',${`endorsement:post:${postId}`})
        ON CONFLICT (recipient_id,aggregation_key) WHERE read_at IS NULL
        DO UPDATE SET actor_id=EXCLUDED.actor_id,aggregated_count=notifications.aggregated_count + 1,last_occurred_at=now(),updated_at=now()
      `;
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}
