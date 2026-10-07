'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { PostComment } from './service';

type Thread = { comment: PostComment; replies: PostComment[] };

function buildThreads(comments: PostComment[]): Thread[] {
  const top = new Map<string, Thread>();
  const repliesByParent = new Map<string, PostComment[]>();
  for (const comment of comments) {
    if (comment.parentCommentId === null) top.set(comment.id, { comment, replies: [] });
    else {
      const list = repliesByParent.get(comment.parentCommentId) ?? [];
      list.push(comment);
      repliesByParent.set(comment.parentCommentId, list);
    }
  }
  for (const thread of top.values()) thread.replies = repliesByParent.get(thread.comment.id) ?? [];
  // A reply to a reply attaches to its top-level ancestor so every thread stays visible.
  const orphans = [...repliesByParent.entries()].filter(([id]) => !top.has(id));
  for (const [, orphansList] of orphans) {
    for (const orphan of orphansList) {
      const root = comments.find((c) => c.id === orphan.parentCommentId);
      if (root !== undefined) top.get(root.id)?.replies.push(orphan);
    }
  }
  return [...top.values()];
}

function CommentBody({ text }: { text: string }) {
  return (
    <p className="comment-body">
      {text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (match === null) return part;
        return (
          <Link key={index} href={match[2]!}>
            {match[1]}
          </Link>
        );
      })}
    </p>
  );
}

function CommentRow({
  comment,
  onReply,
  onLike,
  isReply,
}: {
  comment: PostComment;
  onReply: (comment: PostComment) => void;
  onLike: (comment: PostComment) => void;
  isReply?: boolean;
}) {
  return (
    <div className={isReply ? 'post-comment is-reply' : 'post-comment'}>
      <div className="comment-head">
        <Link href={`/vouch/${comment.authorSlug}`}>{comment.authorName}</Link>
        <span>{comment.authorHeadline ?? 'VouchNet member'}</span>
        <time dateTime={new Date(comment.createdAt).toISOString()}>
          {new Date(comment.createdAt).toLocaleDateString()}
        </time>
      </div>
      <CommentBody text={comment.bodyMarkdown} />
      <div className="comment-actions">
        <button
          className={comment.viewerLiked ? 'comment-like liked' : 'comment-like'}
          onClick={() => onLike(comment)}
          type="button"
        >
          ♥ {comment.likeCount > 0 ? comment.likeCount : ''}
        </button>
        <button className="comment-reply" onClick={() => onReply(comment)} type="button">
          Reply
        </button>
      </div>
    </div>
  );
}

export function PostComments({ postId, commentCount }: { postId: string; commentCount: number }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/posts/${postId}/comments`, { cache: 'no-store' });
    if (!response.ok) throw new Error('COMMENTS_UNAVAILABLE');
    const data = (await response.json()) as { comments: PostComment[] };
    setComments(data.comments);
  }, [postId]);

  useEffect(() => {
    if (!open || comments !== null) return;
    const timer = window.setTimeout(() => {
      load().catch(() => setError('Comments could not be loaded.'));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, comments, load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const body = String(form.get('commentBody') ?? '').trim();
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bodyMarkdown: body, parentCommentId: replyTo?.id ?? null }),
      });
      if (!response.ok) {
        setError('Your comment could not be posted.');
        return;
      }
      setReplyTo(null);
      (event.target as HTMLFormElement).reset();
      await load();
    } catch {
      setError('Your comment could not be posted because the network is unavailable.');
    } finally {
      setSubmitting(false);
    }
  }

  async function like(comment: PostComment) {
    const liked = !comment.viewerLiked;
    setComments(
      (current) =>
        current?.map((item) =>
          item.id === comment.id
            ? { ...item, viewerLiked: liked, likeCount: item.likeCount + (liked ? 1 : -1) }
            : item,
        ) ?? null,
    );
    const response = await fetch(`/api/posts/${postId}/comments/${comment.id}/reactions`, {
      method: 'POST',
    }).catch(() => null);
    if (response === null || !response.ok) {
      setComments(
        (current) =>
          current?.map((item) =>
            item.id === comment.id
              ? { ...item, viewerLiked: !liked, likeCount: item.likeCount + (liked ? -1 : 1) }
              : item,
          ) ?? null,
      );
    }
  }

  return (
    <div className="post-comments">
      <button className="comments-toggle" onClick={() => setOpen(!open)} type="button">
        {open ? 'Hide comments' : `${commentCount} comment${commentCount === 1 ? '' : 's'}`}
      </button>
      {open ? (
        <>
          {comments === null ? <p className="comments-loading">Loading comments…</p> : null}
          {comments !== null && comments.length === 0 ? (
            <p className="comments-empty">No comments yet. Be the first to reply.</p>
          ) : null}
          {comments !== null
            ? buildThreads(comments).map((thread) => (
                <div className="comment-thread" key={thread.comment.id}>
                  <CommentRow comment={thread.comment} onLike={like} onReply={setReplyTo} />
                  {thread.replies.map((reply) => (
                    <CommentRow
                      comment={reply}
                      isReply
                      key={reply.id}
                      onLike={like}
                      onReply={setReplyTo}
                    />
                  ))}
                </div>
              ))
            : null}
          {error !== null ? <p className="comments-error">{error}</p> : null}
          <form className="comment-form" onSubmit={(event) => void submit(event)}>
            {replyTo !== null ? (
              <p className="comment-replying">
                Replying to {replyTo.authorName}
                <button onClick={() => setReplyTo(null)} type="button">
                  ×
                </button>
              </p>
            ) : null}
            <input
              maxLength={4000}
              name="commentBody"
              placeholder={replyTo === null ? 'Add a comment…' : `Reply to ${replyTo.authorName}…`}
              required
            />
            <button disabled={submitting} type="submit">
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
