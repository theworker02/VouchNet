import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { openUrl } from '@tauri-apps/plugin-opener';

type Profile = { fullName: string; headline: string | null; slug: string } | null;
type FeedPost = {
  id: string;
  authorName: string;
  authorHeadline: string | null;
  bodyMarkdown: string;
  createdAt: string;
  peerSignal: number;
};
type FeedPayload = { posts: FeedPost[] };
type View = 'home' | 'network' | 'messages' | 'notifications' | 'jobs' | 'organizations';

const views: { id: View; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'network', label: 'Network', icon: '◎' },
  { id: 'messages', label: 'Messages', icon: '✉' },
  { id: 'notifications', label: 'Activity', icon: '◇' },
  { id: 'jobs', label: 'Jobs', icon: '▣' },
  { id: 'organizations', label: 'Organizations', icon: '◈' },
];

export function App() {
  const [profile, setProfile] = useState<Profile>(null);
  const [view, setView] = useState<View>('home');
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [status, setStatus] = useState<'connecting' | 'signed-out' | 'ready' | 'error'>(
    'connecting',
  );
  const [commandOpen, setCommandOpen] = useState(false);

  async function restore() {
    try {
      const result = await invoke<Profile>('desktop_restore_session');
      setProfile(result);
      setStatus(result === null ? 'signed-out' : 'ready');
      if (result !== null) {
        const response = await invoke<FeedPayload>('desktop_feed');
        setFeed(response.posts);
      }
    } catch {
      setStatus('error');
    }
  }
  useEffect(() => {
    void restore();
  }, []);
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onOpenUrl((urls) => {
      if (urls[0] !== undefined) void finishAuthentication(urls[0]);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  async function startAuthentication() {
    try {
      await openUrl(await invoke<string>('desktop_begin_authentication'));
    } catch {
      setStatus('error');
    }
  }
  async function finishAuthentication(callbackUrl: string) {
    try {
      setProfile(await invoke<Profile>('desktop_complete_authentication', { callbackUrl }));
      setStatus('ready');
      await restore();
    } catch {
      setStatus('error');
    }
  }
  if (status === 'connecting')
    return (
      <main className="desktop-splash">
        <div className="desktop-mark">V</div>
        <h1>VouchNet</h1>
        <p>Connecting…</p>
      </main>
    );
  if (status === 'signed-out')
    return (
      <main className="desktop-welcome">
        <div className="desktop-mark">V</div>
        <p className="kicker">VouchNet Desktop</p>
        <h1>Your professional network, everywhere.</h1>
        <p>
          Use your existing VouchNet account. Authentication continues securely in your system
          browser.
        </p>
        <button onClick={() => void startAuthentication()}>Continue with VouchNet</button>
        <a href="https://vouchnet.dev/signup">Create an account</a>
      </main>
    );
  return (
    <main className="desktop-app">
      <aside className="desktop-rail">
        <div className="desktop-mark">V</div>
        {views.map((item) => (
          <button
            className={view === item.id ? 'active' : ''}
            key={item.id}
            onClick={() => setView(item.id)}
            title={item.label}
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </button>
        ))}
        <button
          className="desktop-profile"
          onClick={() => setCommandOpen(true)}
          title="Open command palette"
        >
          {profile?.fullName.slice(0, 1) ?? 'V'}
        </button>
      </aside>
      <aside className="desktop-sidebar">
        <header>
          <strong>VouchNet</strong>
          <span>{profile?.headline ?? 'Professional network'}</span>
        </header>
        {views.map((item) => (
          <button
            className={view === item.id ? 'selected' : ''}
            key={item.id}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
        <button className="create-button" onClick={() => setCommandOpen(true)}>
          ＋ Create
        </button>
      </aside>
      <section className="desktop-main">
        <header className="desktop-main-header">
          <div>
            <p className="kicker">{view}</p>
            <h1>
              {view === 'home'
                ? 'Your signal desk'
                : views.find((entry) => entry.id === view)?.label}
            </h1>
          </div>
          <button onClick={() => setCommandOpen(true)}>
            Search VouchNet <kbd>Ctrl K</kbd>
          </button>
        </header>
        {view === 'home' ? (
          <>
            <button
              className="desktop-composer"
              onClick={() => window.open('https://vouchnet.dev/feed/create', '_blank', 'noopener')}
            >
              What&apos;s happening? <span>Create a post on VouchNet</span>
            </button>
            <div className="desktop-feed">
              {feed.length === 0 ? (
                <p className="desktop-empty">
                  Your feed will appear here once your shared network has activity.
                </p>
              ) : (
                feed.map((post) => (
                  <article key={post.id}>
                    <header>
                      <span className="post-avatar">{post.authorName.slice(0, 1)}</span>
                      <div>
                        <strong>{post.authorName}</strong>
                        <small>
                          {post.authorHeadline ?? 'VouchNet member'} ·{' '}
                          {new Date(post.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                    </header>
                    <p>{post.bodyMarkdown}</p>
                    <footer>
                      ⌁ {post.peerSignal} peer signal{' '}
                      <a href={`https://vouchnet.dev/post/${post.id}`}>Open post</a>
                    </footer>
                  </article>
                ))
              )}
            </div>
          </>
        ) : (
          <section className="desktop-route">
            <h2>{views.find((entry) => entry.id === view)?.label}</h2>
            <p>
              This desktop surface stays attached to the same VouchNet account and service. Open the
              complete responsive workflow while the native view for this area rolls out.
            </p>
            <a
              href={`https://vouchnet.dev/${view === 'organizations' ? 'company' : view === 'network' ? 'mynetwork' : view}`}
            >
              Open on VouchNet
            </a>
          </section>
        )}
      </section>
      {commandOpen ? (
        <div className="command-backdrop" onMouseDown={() => setCommandOpen(false)}>
          <section className="command-palette" onMouseDown={(event) => event.stopPropagation()}>
            <input autoFocus placeholder="Search VouchNet…" />
            <p>Quick actions</p>
            {views.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setCommandOpen(false);
                }}
              >
                Open {item.label}
              </button>
            ))}
          </section>
        </div>
      ) : null}
    </main>
  );
}
