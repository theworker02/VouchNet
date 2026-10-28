'use client';

import Link from 'next/link';
import { useState } from 'react';

type SavedPost = {
  id: string;
  authorName: string;
  authorSlug: string;
  authorHeadline: string | null;
  bodyMarkdown: string;
  category: string;
  createdAt: string;
  savedAt: string;
  peerSignal: number;
  commentCount: number;
};

export function SavedClient({ initialPosts }: { initialPosts: SavedPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [status, setStatus] = useState<string | null>(null);

  async function remove(postId: string) {
    const previous = posts;
    setPosts((current) => current.filter((post) => post.id !== postId));
    try {
      const response = await fetch(`/api/saved/${postId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('UNSAVE_FAILED');
      setStatus(null);
    } catch {
      setPosts(previous);
      setStatus('That post could not be removed from Saved.');
    }
  }

  return (
    <section className="saved-page">
      <header className="saved-heading">
        <p className="eyebrow">Saved</p>
        <h1>Keep useful work close.</h1>
        <p>Posts you save stay private to your account and respect visibility and block rules.</p>
      </header>
      {status ? (
        <p className="form-error" role="status">
          {status}
        </p>
      ) : null}
      {posts.length === 0 ? (
        <section className="saved-empty">
          <h2>Nothing saved yet.</h2>
          <p>Use Save on a feed post to keep technical notes and project updates for later.</p>
          <Link className="primary" href="/feed">
            Open your feed
          </Link>
        </section>
      ) : (
        <div className="saved-list">
          {posts.map((post) => (
            <article className="saved-card" key={post.id}>
              <header>
                <div>
                  <Link href={`/vouch/${post.authorSlug}`}>{post.authorName}</Link>
                  <p>
                    {post.authorHeadline ?? 'VouchNet member'} · {post.category.toLowerCase()}
                  </p>
                  <time dateTime={post.savedAt}>
                    Saved {new Date(post.savedAt).toLocaleString()}
                  </time>
                </div>
                <button className="secondary" onClick={() => void remove(post.id)} type="button">
                  Remove
                </button>
              </header>
              <p>{post.bodyMarkdown}</p>
              <footer>
                <span>
                  ⌁ {post.peerSignal} peer signal · {post.commentCount} comments
                </span>
                <Link href={`/post/${post.id}`}>Open post</Link>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
