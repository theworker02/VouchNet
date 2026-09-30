'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { FeedPost, PostCategory, PostVisibility, ReactionType } from './service';

const categories: readonly PostCategory[] = ['TECHNICAL', 'PROJECT', 'HIRING', 'STATUS', 'OPINION'];
const reactions: readonly ReactionType[] = ['UPVOTE', 'VERIFY', 'INSIGHTFUL', 'BENCHMARK'];

async function requestFeed(
  mode: 'CHRONOLOGICAL' | 'PEER_VERIFIED',
  hidden: readonly PostCategory[],
) {
  const parameters = new URLSearchParams({ mode });
  hidden.forEach((category) => parameters.append('hide', category));
  const response = await fetch(`/api/feed?${parameters.toString()}`);
  if (!response.ok) throw new Error('FEED_UNAVAILABLE');
  return (await response.json()) as { posts: FeedPost[] };
}

function MarkdownBody({ body }: { body: string }) {
  const blocks = useMemo(() => body.split(/(```[\s\S]*?```)/g).filter(Boolean), [body]);
  return (
    <div className="post-body">
      {blocks.map((block, index) =>
        block.startsWith('```') ? (
          <pre key={index}>
            <code>{block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')}</code>
          </pre>
        ) : (
          block
            .split(/\n{2,}/)
            .map((paragraph, paragraphIndex) => (
              <p key={`${index}-${paragraphIndex}`}>{paragraph}</p>
            ))
        ),
      )}
    </div>
  );
}

function PostCard({
  post,
  onReaction,
}: {
  post: FeedPost;
  onReaction: (postId: string, reaction: ReactionType) => void;
}) {
  return (
    <article className="post-card">
      <header className="post-header">
        <div className="post-avatar" aria-hidden="true">
          {post.authorName
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)}
        </div>
        <div>
          <Link href={`/vouch/${post.authorSlug}`}>{post.authorName}</Link>
          <p>
            {post.authorHeadline ?? 'VouchNet member'} · {post.category.toLowerCase()}
          </p>
          <time dateTime={new Date(post.createdAt).toISOString()}>
            {new Date(post.createdAt).toLocaleString()}
          </time>
        </div>
      </header>
      <MarkdownBody body={post.bodyMarkdown} />
      {post.codeSnippets.map((snippet, index) => (
        <pre className="post-code" key={`${snippet.language}-${index}`}>
          <code data-language={snippet.language}>{snippet.code}</code>
        </pre>
      ))}
      <footer className="post-footer">
        <span>
          {post.peerSignal} peer signal · {post.commentCount} comments
        </span>
        <div className="reaction-row">
          {reactions.map((reaction) => (
            <button
              className={post.viewerReaction === reaction ? 'reaction active-reaction' : 'reaction'}
              key={reaction}
              type="button"
              onClick={() => onReaction(post.id, reaction)}
            >
              {reaction.toLowerCase()} {post.reactionCounts[reaction] || 0}
            </button>
          ))}
        </div>
      </footer>
    </article>
  );
}

export function FeedClient() {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [mode, setMode] = useState<'CHRONOLOGICAL' | 'PEER_VERIFIED'>('CHRONOLOGICAL');
  const [hidden, setHidden] = useState<PostCategory[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState<PostCategory>('TECHNICAL');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [picker, setPicker] = useState<'category' | 'visibility' | null>(null);
  async function load() {
    try {
      const data = await requestFeed(mode, hidden);
      setPosts(data.posts);
    } catch {
      setStatus('The feed is unavailable right now.');
    }
  }
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void requestFeed(mode, hidden)
        .then((data) => {
          if (active) setPosts(data.posts);
        })
        .catch(() => {
          if (active) setStatus('The feed is unavailable right now.');
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [mode, hidden]);
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        bodyMarkdown: String(form.get('bodyMarkdown') ?? ''),
        category: String(form.get('category') ?? 'TECHNICAL'),
        visibility: String(form.get('visibility') ?? 'PUBLIC'),
        codeSnippets: [],
        mediaUrls: [],
        mentionedUserIds: [],
      }),
    });
    setIsSubmitting(false);
    if (!response.ok) {
      setStatus('Your post could not be published.');
      return;
    }
    event.currentTarget.reset();
    await load();
  }
  async function react(postId: string, reactionType: ReactionType) {
    const response = await fetch(`/api/posts/${postId}/reactions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reactionType }),
    });
    if (!response.ok) {
      setStatus('That reaction could not be saved.');
      return;
    }
    await load();
  }
  function toggleCategory(category: PostCategory) {
    setHidden((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }
  return (
    <section className="feed-experience">
      <form className="post-composer" onSubmit={(event) => void publish(event)}>
        <div className="composer-heading">
          <div className="composer-avatar" aria-hidden="true">
            +
          </div>
          <div>
            <strong>Share a useful post</strong>
            <span>Technical notes, projects, hiring context, or a considered point of view.</span>
          </div>
        </div>
        <textarea
          name="bodyMarkdown"
          required
          minLength={1}
          maxLength={12000}
          placeholder="Share useful work, a technical finding, or a project update…"
        />
        <div className="composer-controls">
          <input name="category" type="hidden" value={category} />
          <input name="visibility" type="hidden" value={visibility} />
          <div className="composer-picker">
            <button
              type="button"
              className="composer-picker-trigger"
              onClick={() => setPicker(picker === 'category' ? null : 'category')}
            >
              ⌘ {category[0]}
              {category.slice(1).toLowerCase()} <span>⌄</span>
            </button>
            {picker === 'category' ? (
              <div className="composer-picker-menu">
                {categories.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => {
                      setCategory(item);
                      setPicker(null);
                    }}
                  >
                    <strong>
                      {item[0]}
                      {item.slice(1).toLowerCase()}
                    </strong>
                    <small>
                      {item === 'TECHNICAL'
                        ? 'Engineering and practical insight'
                        : item === 'PROJECT'
                          ? 'Work you made or shipped'
                          : item === 'HIRING'
                            ? 'A role or opportunity'
                            : item === 'STATUS'
                              ? 'A concise professional update'
                              : 'A considered perspective'}
                    </small>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="composer-picker">
            <button
              type="button"
              className="composer-picker-trigger"
              onClick={() => setPicker(picker === 'visibility' ? null : 'visibility')}
            >
              ◉{' '}
              {visibility === 'PUBLIC'
                ? 'Public'
                : visibility === 'FOLLOWERS'
                  ? 'Followers'
                  : 'Contacts'}{' '}
              <span>⌄</span>
            </button>
            {picker === 'visibility' ? (
              <div className="composer-picker-menu visibility-menu">
                {(['PUBLIC', 'FOLLOWERS', 'CONTACTS'] as PostVisibility[]).map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => {
                      setVisibility(item);
                      setPicker(null);
                    }}
                  >
                    <strong>
                      {item === 'PUBLIC'
                        ? 'Public'
                        : item === 'FOLLOWERS'
                          ? 'Followers'
                          : 'Contacts'}
                    </strong>
                    <small>
                      {item === 'PUBLIC'
                        ? 'Visible on your public profile'
                        : item === 'FOLLOWERS'
                          ? 'Visible to people following you'
                          : 'Visible to accepted contacts'}
                    </small>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <span className="composer-note">Markdown supported</span>
          <button disabled={isSubmitting}>{isSubmitting ? 'Publishing…' : 'Publish'}</button>
        </div>
      </form>
      <div className="feed-toolbar">
        <div>
          <p className="feed-toolbar-label">Your feed</p>
          <div className="feed-mode" role="group" aria-label="Feed order">
            <button
              className={mode === 'CHRONOLOGICAL' ? 'active-mode' : ''}
              type="button"
              onClick={() => setMode('CHRONOLOGICAL')}
            >
              Chronological
            </button>
            <button
              className={mode === 'PEER_VERIFIED' ? 'active-mode' : ''}
              type="button"
              onClick={() => setMode('PEER_VERIFIED')}
            >
              Peer-verified signal
            </button>
          </div>
        </div>
        <details>
          <summary>Filters</summary>
          <div className="feed-filters">
            {categories.map((category) => (
              <label key={category}>
                <input
                  type="checkbox"
                  checked={!hidden.includes(category)}
                  onChange={() => toggleCategory(category)}
                />{' '}
                {category.toLowerCase()}
              </label>
            ))}
          </div>
        </details>
      </div>
      {status === null ? null : <p className="form-error">{status}</p>}
      {posts === null ? (
        <section className="feed-empty">
          <p>Loading your eligible feed…</p>
        </section>
      ) : posts.length === 0 ? (
        <section className="feed-empty">
          <h2>No eligible posts yet</h2>
          <p>
            VouchNet does not fabricate activity. Publish a useful update or build your network to
            change this.
          </p>
        </section>
      ) : (
        <div className="post-list">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onReaction={(postId, reactionType) => void react(postId, reactionType)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
