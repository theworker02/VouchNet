import 'server-only';
import { createSqlClient } from '@nexus/db';

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (value === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return value;
}

export type SavedPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorSlug: string;
  authorHeadline: string | null;
  bodyMarkdown: string;
  category: string;
  createdAt: Date;
  savedAt: Date;
  peerSignal: number;
  commentCount: number;
};

async function assertPostVisibleToViewer(
  sql: ReturnType<typeof createSqlClient>,
  viewerId: string,
  postId: string,
): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    SELECT p.id
    FROM posts p
    WHERE p.id=${postId}
      AND p.status='PUBLISHED'
      AND p.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id=${viewerId} AND b.blocked_id=p.author_id)
           OR (b.blocker_id=p.author_id AND b.blocked_id=${viewerId})
      )
      AND (
        p.author_id=${viewerId}
        OR p.visibility IN ('PUBLIC','MEMBERS')
        OR (
          p.visibility='FOLLOWERS'
          AND EXISTS (
            SELECT 1 FROM follows f
            WHERE f.follower_id=${viewerId} AND f.followed_id=p.author_id
          )
        )
        OR (
          p.visibility='CONTACTS'
          AND EXISTS (
            SELECT 1 FROM connections c
            WHERE c.state='ACCEPTED'
              AND (
                (c.requester_id=${viewerId} AND c.recipient_id=p.author_id)
                OR (c.recipient_id=${viewerId} AND c.requester_id=p.author_id)
              )
          )
        )
      )
  `;
  return rows[0] !== undefined;
}

export async function listSavedPosts(viewerId: string): Promise<SavedPost[]> {
  const sql = createSqlClient(databaseUrl());
  try {
    return await sql<SavedPost[]>`
      SELECT
        p.id,
        p.author_id AS "authorId",
        concat(pr.first_name,' ',pr.last_name) AS "authorName",
        pr.slug AS "authorSlug",
        pr.headline AS "authorHeadline",
        p.body_markdown AS "bodyMarkdown",
        p.feed_category AS category,
        p.created_at AS "createdAt",
        s.created_at AS "savedAt",
        COALESCE((
          SELECT sum(
            CASE r.reaction_type
              WHEN 'VERIFY' THEN 4
              WHEN 'BENCHMARK' THEN 3
              WHEN 'INSIGHTFUL' THEN 2
              ELSE 1
            END
          )::int
          FROM post_reactions r
          JOIN connections c
            ON c.state='ACCEPTED'
           AND (
             (c.requester_id=r.user_id AND c.recipient_id=p.author_id)
             OR (c.recipient_id=r.user_id AND c.requester_id=p.author_id)
           )
          WHERE r.post_id=p.id
        ),0) AS "peerSignal",
        (
          SELECT count(*)::int
          FROM post_comments pc
          WHERE pc.post_id=p.id AND pc.deleted_at IS NULL
        ) AS "commentCount"
      FROM saved_posts s
      JOIN posts p ON p.id=s.post_id
      JOIN profiles pr ON pr.user_id=p.author_id
      WHERE s.user_id=${viewerId}
        AND p.status='PUBLISHED'
        AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id=${viewerId} AND b.blocked_id=p.author_id)
             OR (b.blocker_id=p.author_id AND b.blocked_id=${viewerId})
        )
        AND (
          p.author_id=${viewerId}
          OR p.visibility IN ('PUBLIC','MEMBERS')
          OR (
            p.visibility='FOLLOWERS'
            AND EXISTS (
              SELECT 1 FROM follows f
              WHERE f.follower_id=${viewerId} AND f.followed_id=p.author_id
            )
          )
          OR (
            p.visibility='CONTACTS'
            AND EXISTS (
              SELECT 1 FROM connections c
              WHERE c.state='ACCEPTED'
                AND (
                  (c.requester_id=${viewerId} AND c.recipient_id=p.author_id)
                  OR (c.recipient_id=${viewerId} AND c.requester_id=p.author_id)
                )
            )
          )
        )
      ORDER BY s.created_at DESC
      LIMIT 100
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function savePost(viewerId: string, postId: string): Promise<'saved' | 'unchanged'> {
  const sql = createSqlClient(databaseUrl());
  try {
    const visible = await assertPostVisibleToViewer(sql, viewerId, postId);
    if (!visible) throw new Error('POST_NOT_FOUND');
    const rows = await sql<{ post_id: string }[]>`
      INSERT INTO saved_posts (user_id, post_id)
      VALUES (${viewerId}, ${postId})
      ON CONFLICT (user_id, post_id) DO NOTHING
      RETURNING post_id
    `;
    return rows[0] === undefined ? 'unchanged' : 'saved';
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function unsavePost(viewerId: string, postId: string): Promise<boolean> {
  const sql = createSqlClient(databaseUrl());
  try {
    const rows = await sql<{ post_id: string }[]>`
      DELETE FROM saved_posts
      WHERE user_id=${viewerId} AND post_id=${postId}
      RETURNING post_id
    `;
    return rows.length === 1;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function isPostSaved(viewerId: string, postId: string): Promise<boolean> {
  const sql = createSqlClient(databaseUrl());
  try {
    const rows = await sql<{ post_id: string }[]>`
      SELECT post_id FROM saved_posts WHERE user_id=${viewerId} AND post_id=${postId}
    `;
    return rows[0] !== undefined;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
