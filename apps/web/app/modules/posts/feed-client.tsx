'use client';

import Link from 'next/link';
import {
  ChangeEvent,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { EmeraldVouchBadge, ProofOfWorkBadge, SignalPulseIcon } from '../../components/symbols';
import { ReactionBar } from '../../components/feed/reaction-bar';
import { InteractivePostFrame } from '../../components/experiences/interactive-post-frame';
import { InteractiveCard } from '../../components/motion/interactive-card';
import type { FeedDiscovery } from '../../lib/feed-discovery-model';
import { useMotionPreference } from '../../lib/motion';
import type { FeedPost, PostCategory, PostVisibility, ReactionType } from './service';
import { PostComments } from './post-comments';

const categories: readonly PostCategory[] = ['TECHNICAL', 'PROJECT', 'HIRING', 'STATUS', 'OPINION'];

async function requestFeed(
  mode: 'CHRONOLOGICAL' | 'PEER_VERIFIED',
  hidden: readonly PostCategory[],
  signal?: AbortSignal,
) {
  const parameters = new URLSearchParams({ mode });
  hidden.forEach((category) => parameters.append('hide', category));
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`/api/feed?${parameters.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('FEED_UNAVAILABLE');
    return (await response.json()) as { posts: FeedPost[]; discovery: FeedDiscovery };
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

function InlineText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (match === null) return part;
        return (
          <Link key={index} href={match[2]!}>
            {match[1]}
          </Link>
        );
      })}
    </>
  );
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
          block.split(/\n{2,}/).map((paragraph, paragraphIndex) => (
            <p key={`${index}-${paragraphIndex}`}>
              <InlineText text={paragraph} />
            </p>
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
      {post.postType === 'INTERACTIVE' &&
      post.interactiveContent !== null &&
      post.interactiveStatus === 'ACTIVE' ? (
        <InteractivePostFrame content={post.interactiveContent} />
      ) : null}
      {post.postType === 'INTERACTIVE' && post.interactiveStatus === 'DISABLED' ? (
        <p className="experience-disabled" role="status">
          This Experience has been disabled while the surrounding post remains available.
        </p>
      ) : null}
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
      <PostComments commentCount={post.commentCount} postId={post.id} />
    </InteractiveCard>
  );
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function SuggestedSignalStream({ discovery }: { discovery: FeedDiscovery | null }) {
  const jobs = discovery?.jobs ?? [];
  const organizations = discovery?.organizations ?? [];
  const challenge = discovery?.dailyChallenge;
  return (
    <section className="suggested-signal-stream" aria-label="Suggested signals">
      <div className="suggested-signal-heading">
        <span>
          <ProofOfWorkBadge size="sm" /> Suggested signal
        </span>
        <p>
          Source-reviewed public records and original VouchNet activities while your member feed
          takes shape. These are not member posts.
        </p>
      </div>
      {jobs.map((job) => (
        <InteractiveCard key={job.slug}>
          <p>Source-reviewed opportunity · {job.organizationName}</p>
          <h2>{job.title}</h2>
          <span>
            {job.location}
            {job.salaryMin === null || job.salaryMax === null
              ? ' · Salary not disclosed'
              : ` · ${money(job.salaryMin, job.salaryCurrency)}–${money(job.salaryMax, job.salaryCurrency)}`}
          </span>
          <Link href={`/jobs/${job.slug}`}>Review role</Link>
        </InteractiveCard>
      ))}
      {organizations.map((organization) => (
        <InteractiveCard key={organization.slug}>
          <p>Source-reviewed organization</p>
          <h2>{organization.name}</h2>
          <span>
            {organization.openRoleCount} open role{organization.openRoleCount === 1 ? '' : 's'}
            {organization.technologies.length > 0
              ? ` · ${organization.technologies.slice(0, 2).join(' · ')}`
              : ''}
          </span>
          <Link href={`/company/${organization.slug}`}>Explore organization</Link>
        </InteractiveCard>
      ))}
      {challenge === undefined ? null : (
        <InteractiveCard>
          <p>Original VouchNet daily challenge</p>
          <h2>{challenge.title}</h2>
          <span>
            {challenge.difficultyLabel} difficulty · solve it in {challenge.moveBudget} moves or
            fewer.
          </span>
          <Link href="/games">Play today&apos;s challenge</Link>
        </InteractiveCard>
      )}
    </section>
  );
}

export function FeedClient() {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [discovery, setDiscovery] = useState<FeedDiscovery | null>(null);
  const [mode, setMode] = useState<'CHRONOLOGICAL' | 'PEER_VERIFIED'>('CHRONOLOGICAL');
  const [hidden, setHidden] = useState<PostCategory[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState<PostCategory>('TECHNICAL');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [picker, setPicker] = useState<'category' | 'visibility' | null>(null);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [body, setBody] = useState('');
  const [format, setFormat] = useState<'PLAIN' | 'MARKDOWN'>('PLAIN');
  const [mentionQuery, setMentionQuery] = useState<{ text: string; start: number } | null>(null);
  const [mentionResults, setMentionResults] = useState<{
    people: { id: string; name: string; slug: string; headline: string | null }[];
    organizations: { id: string; name: string; slug: string }[];
  } | null>(null);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [mentionedOrgIds, setMentionedOrgIds] = useState<string[]>([]);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const motionPreference = useMotionPreference();
  const categoryPickerId = useId();
  const visibilityPickerId = useId();
  async function load() {
    try {
      const data = await requestFeed(mode, hidden);
      setPosts(data.posts);
      setDiscovery(data.discovery);
      setStatus(null);
    } catch {
      setStatus('The feed is unavailable right now.');
    }
  }
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void requestFeed(mode, hidden, controller.signal)
        .then((data) => {
          if (active) {
            setPosts(data.posts);
            setDiscovery(data.discovery);
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
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [mode, hidden]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (mentionQuery === null || mentionQuery.text.length === 0) {
        setMentionResults(null);
        return;
      }
      void fetch(`/api/mentions?q=${encodeURIComponent(mentionQuery.text)}`)
        .then(async (response) => (response.ok ? ((await response.json()) as never) : null))
        .then((data) => setMentionResults(data))
        .catch(() => setMentionResults(null));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [mentionQuery]);

  function handleBodyChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.currentTarget.value;
    setBody(value);
    const caret = event.currentTarget.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const match = before.match(/@([\w&.'\- ]{1,32})$/);
    if (match === null || /\s{2,}$/.test(match[1]!)) setMentionQuery(null);
    else setMentionQuery({ text: match[1]!, start: caret - match[1]!.length - 1 });
  }

  function insertMention(target: { id: string; name: string; href: string; isOrg: boolean }) {
    if (mentionQuery === null) return;
    const caret = bodyRef.current?.selectionStart ?? body.length;
    const next = `${body.slice(0, mentionQuery.start)}[@${target.name}](${target.href})${body.slice(caret)}`;
    setBody(next);
    if (target.isOrg) setMentionedOrgIds((ids) => [...new Set([...ids, target.id])]);
    else setMentionedUserIds((ids) => [...new Set([...ids, target.id])]);
    setMentionQuery(null);
    setMentionResults(null);
    window.setTimeout(() => bodyRef.current?.focus(), 0);
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          bodyMarkdown: body,
          category,
          visibility,
          codeSnippets: [],
          mediaUrls: [],
          mentionedUserIds,
          mentionedOrgIds,
        }),
      });
      if (!response.ok) {
        setStatus('Your post could not be published.');
        return;
      }
      setStatus(null);
      setBody('');
      setMentionedUserIds([]);
      setMentionedOrgIds([]);
      setComposerExpanded(false);
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
          placeholder={
            format === 'MARKDOWN'
              ? 'Write in Markdown — links, ```code blocks```, and @mentions…'
              : 'Share useful work, a technical finding, or a project update… type @ to mention someone'
          }
          ref={bodyRef}
          value={body}
          onChange={handleBodyChange}
          onFocus={() => setComposerExpanded(true)}
          onBlur={(event) => {
            if (event.currentTarget.value.trim().length === 0) setComposerExpanded(false);
          }}
        />
        {mentionResults !== null &&
        (mentionResults.people.length > 0 || mentionResults.organizations.length > 0) ? (
          <div className="mention-menu" role="listbox">
            {mentionResults.people.map((person) => (
              <button
                className="mention-option"
                key={person.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention({
                    id: person.id,
                    name: person.name,
                    href: `/vouch/${person.slug}`,
                    isOrg: false,
                  });
                }}
                type="button"
              >
                <strong>@{person.name}</strong>
                <small>{person.headline ?? 'VouchNet member'}</small>
              </button>
            ))}
            {mentionResults.organizations.map((organization) => (
              <button
                className="mention-option"
                key={organization.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention({
                    id: organization.id,
                    name: organization.name,
                    href: `/company/${organization.slug}`,
                    isOrg: true,
                  });
                }}
                type="button"
              >
                <strong>@{organization.name}</strong>
                <small>Organization</small>
              </button>
            ))}
          </div>
        ) : null}
        {format === 'MARKDOWN' && body.trim().length > 0 ? (
          <div className="composer-preview">
            <span className="composer-preview-label">Preview</span>
            <MarkdownBody body={body} />
          </div>
        ) : null}
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
          <div className="composer-format" role="group" aria-label="Post format">
            <button
              className={
                format === 'PLAIN' ? 'composer-format-option active' : 'composer-format-option'
              }
              onClick={() => setFormat('PLAIN')}
              type="button"
            >
              Plain text
            </button>
            <button
              className={
                format === 'MARKDOWN' ? 'composer-format-option active' : 'composer-format-option'
              }
              onClick={() => setFormat('MARKDOWN')}
              type="button"
            >
              Markdown
            </button>
          </div>
          <Link className="composer-experience-link" href="/feed/create">
            Create Experience
          </Link>
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
      {status === null ? null : (
        <div className="feed-status" role="status">
          <p className="form-error">{status}</p>
          {posts !== null ? (
            <button type="button" className="secondary feed-retry" onClick={() => void load()}>
              Retry feed
            </button>
          ) : null}
        </div>
      )}
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
          <SuggestedSignalStream discovery={discovery} />
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
