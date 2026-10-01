'use client';

import Link from 'next/link';
import { FocusEvent, FormEvent, KeyboardEvent, useEffect, useId, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { EmeraldVouchBadge, ProofOfWorkBadge, SignalPulseIcon } from '../../components/symbols';
import { ReactionBar } from '../../components/feed/reaction-bar';
import { InteractiveCard } from '../../components/motion/interactive-card';
import { useMotionPreference } from '../../lib/motion';
import type { FeedPost, PostCategory, PostVisibility, ReactionType } from './service';

const categories: readonly PostCategory[] = ['TECHNICAL', 'PROJECT', 'HIRING', 'STATUS', 'OPINION'];

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
    <InteractiveCard className="post-card">
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
          {post.isPlusAuthor ? (
            <span className="emerald-signal" title="VouchNet+ member">
              <EmeraldVouchBadge size="sm" /> Emerald signal
            </span>
          ) : null}
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
        <span className="post-signal">
          <SignalPulseIcon size="sm" />
          {post.peerSignal} peer signal · {post.commentCount} comments
        </span>
        <ReactionBar
          counts={post.reactionCounts}
          onReact={(reaction) => onReaction(post.id, reaction)}
          value={post.viewerReaction}
        />
      </footer>
    </InteractiveCard>
  );
}

function SuggestedSignalStream() {
  const signals = [
    {
      topic: 'Systems note',
      title: 'How to make a migration plan that survives production reality',
      detail:
        'A practical starting point for schema changes, rollback boundaries, and operational ownership.',
      href: '/search?q=postgres%20migration',
    },
    {
      topic: 'Architecture discussion',
      title: 'Where compute-shader pipelines earn their complexity',
      detail:
        'Explore public profiles and project context around graphics, systems, and performance work.',
      href: '/search?q=compute%20shaders',
    },
    {
      topic: 'Career signal',
      title: 'Transparent technical roles with compensation context',
      detail: 'Browse currently sourced roles without leaving an empty feed behind.',
      href: '/jobs',
    },
  ] as const;
  return (
    <section className="suggested-signal-stream" aria-label="Suggested signals">
      <div className="suggested-signal-heading">
        <span>
          <ProofOfWorkBadge size="sm" /> Suggested signal
        </span>
        <p>Platform-curated starting points while you build your network.</p>
      </div>
      {signals.map((signal) => (
        <InteractiveCard key={signal.title}>
          <p>{signal.topic}</p>
          <h2>{signal.title}</h2>
          <span>{signal.detail}</span>
          <Link href={signal.href}>Explore this signal</Link>
        </InteractiveCard>
      ))}
    </section>
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
  const [composerExpanded, setComposerExpanded] = useState(false);
  const motionPreference = useMotionPreference();
  const categoryPickerId = useId();
  const visibilityPickerId = useId();
  async function load() {
    try {
      const data = await requestFeed(mode, hidden);
      setPosts(data.posts);
      setStatus(null);
    } catch {
      setStatus('The feed is unavailable right now.');
    }
  }
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void requestFeed(mode, hidden)
        .then((data) => {
          if (active) {
            setPosts(data.posts);
            setStatus(null);
          }
        })
        .catch(() => {
          if (active) {
            setPosts([]);
            setStatus('The feed could not be refreshed. You can still publish a post or retry.');
          }
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
    try {
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
      if (!response.ok) {
        setStatus('Your post could not be published.');
        return;
      }
      setStatus(null);
      event.currentTarget.reset();
      await load();
    } catch {
      setStatus('Your post could not be published because the network is unavailable. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }
  async function react(postId: string, reactionType: ReactionType) {
    const previousPosts = posts;
    setPosts(
      (current) =>
        current?.map((post) => {
          if (post.id !== postId) return post;
          const nextCounts = { ...post.reactionCounts };
          if (post.viewerReaction !== null) {
            nextCounts[post.viewerReaction] = Math.max(0, nextCounts[post.viewerReaction] - 1);
          }
          nextCounts[reactionType] += 1;
          return { ...post, viewerReaction: reactionType, reactionCounts: nextCounts };
        }) ?? null,
    );
    try {
      const response = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reactionType }),
      });
      if (!response.ok) {
        setPosts(previousPosts);
        setStatus('That reaction could not be saved.');
        return;
      }
      setStatus(null);
    } catch {
      setPosts(previousPosts);
      setStatus('That reaction could not be saved.');
    }
  }
  function toggleCategory(category: PostCategory) {
    setHidden((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }
  function closePickerWhenFocusLeaves(event: FocusEvent<HTMLDivElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
      return;
    setPicker(null);
  }
  function handlePickerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    setPicker(null);
  }
  return (
    <section className="feed-experience">
      <motion.form
        className={composerExpanded ? 'post-composer composer-expanded' : 'post-composer'}
        layout
        transition={motionPreference.spring}
        onSubmit={(event) => void publish(event)}
      >
        <div className="composer-heading">
          <div className="composer-avatar" aria-hidden="true">
            +
          </div>
          <div>
            <strong>Share a useful post</strong>
            <span>Technical notes, projects, hiring context, or a considered point of view.</span>
          </div>
        </div>
        <motion.textarea
          layout
          transition={motionPreference.spring}
          name="bodyMarkdown"
          required
          minLength={1}
          maxLength={12000}
          placeholder="Share useful work, a technical finding, or a project update…"
          onFocus={() => setComposerExpanded(true)}
          onBlur={(event) => {
            if (event.currentTarget.value.trim().length === 0) setComposerExpanded(false);
          }}
        />
        <div className="composer-controls">
          <input name="category" type="hidden" value={category} />
          <input name="visibility" type="hidden" value={visibility} />
          <div
            className="composer-picker"
            onBlur={closePickerWhenFocusLeaves}
            onKeyDown={handlePickerKeyDown}
          >
            <button
              aria-controls={categoryPickerId}
              aria-expanded={picker === 'category'}
              aria-haspopup="dialog"
              type="button"
              className="composer-picker-trigger"
              onClick={() => setPicker(picker === 'category' ? null : 'category')}
            >
              ⌘ {category[0]}
              {category.slice(1).toLowerCase()} <span>⌄</span>
            </button>
            <AnimatePresence initial={false}>
              {picker === 'category' ? (
                <motion.div
                  aria-label="Choose a post category"
                  className="composer-picker-menu"
                  id={categoryPickerId}
                  role="menu"
                  initial={
                    motionPreference.reducedMotion ? false : { opacity: 0, y: -5, scale: 0.98 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    motionPreference.reducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -4, scale: 0.98 }
                  }
                  transition={motionPreference.spring}
                >
                  {categories.map((item) => (
                    <button
                      aria-checked={category === item}
                      role="menuitemradio"
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
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <div
            className="composer-picker"
            onBlur={closePickerWhenFocusLeaves}
            onKeyDown={handlePickerKeyDown}
          >
            <button
              aria-controls={visibilityPickerId}
              aria-expanded={picker === 'visibility'}
              aria-haspopup="dialog"
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
            <AnimatePresence initial={false}>
              {picker === 'visibility' ? (
                <motion.div
                  aria-label="Choose post visibility"
                  className="composer-picker-menu visibility-menu"
                  id={visibilityPickerId}
                  role="menu"
                  initial={
                    motionPreference.reducedMotion ? false : { opacity: 0, y: -5, scale: 0.98 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    motionPreference.reducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -4, scale: 0.98 }
                  }
                  transition={motionPreference.spring}
                >
                  {(['PUBLIC', 'FOLLOWERS', 'CONTACTS'] as PostVisibility[]).map((item) => (
                    <button
                      aria-checked={visibility === item}
                      role="menuitemradio"
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
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <span className="composer-note">Markdown supported</span>
          <button disabled={isSubmitting}>{isSubmitting ? 'Publishing…' : 'Publish'}</button>
        </div>
      </motion.form>
      <div className="feed-toolbar">
        <div>
          <p className="feed-toolbar-label">Your feed</p>
          <LayoutGroup id="feed-order">
            <div className="feed-mode" role="group" aria-label="Feed order">
              <button
                className={mode === 'CHRONOLOGICAL' ? 'active-mode' : ''}
                type="button"
                onClick={() => setMode('CHRONOLOGICAL')}
              >
                {mode === 'CHRONOLOGICAL' ? (
                  <motion.span
                    aria-hidden="true"
                    className="feed-active-indicator"
                    layoutId="active-tab-indicator"
                    transition={motionPreference.spring}
                  />
                ) : null}
                <span className="feed-mode-label">Chronological</span>
              </button>
              <button
                className={mode === 'PEER_VERIFIED' ? 'active-mode' : ''}
                type="button"
                onClick={() => setMode('PEER_VERIFIED')}
              >
                {mode === 'PEER_VERIFIED' ? (
                  <motion.span
                    aria-hidden="true"
                    className="feed-active-indicator"
                    layoutId="active-tab-indicator"
                    transition={motionPreference.spring}
                  />
                ) : null}
                <span className="feed-mode-label">Peer-verified signal</span>
              </button>
            </div>
          </LayoutGroup>
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
        <>
          <section className="feed-empty">
            <h2>Your feed will get more personal as you follow people.</h2>
            <p>
              Start with a useful post, then use these curated signals to find relevant context.
            </p>
            <div className="actions">
              <Link className="primary" href="/network/discover">
                Discover people
              </Link>
              <Link className="secondary" href="/jobs">
                Browse jobs
              </Link>
            </div>
          </section>
          <SuggestedSignalStream />
        </>
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
