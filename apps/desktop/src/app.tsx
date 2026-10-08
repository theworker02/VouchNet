import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { openUrl } from '@tauri-apps/plugin-opener';

type IdentityVerification = { method: string; verifiedAt: string };
type ProfileService = {
  title: string;
  description: string | null;
  rateAmount: string | null;
  rateCurrency: string;
  rateUnit: 'HOURLY' | 'FIXED' | 'STARTING_AT';
};
type Profile = {
  fullName: string;
  headline: string | null;
  slug: string;
  identityVerification?: IdentityVerification | null;
  earlyMember?: boolean;
  hourlyRateAmount?: string | null;
  hourlyRateCurrency?: string;
  hourlyRateVisible?: boolean;
  services?: ProfileService[];
  isPlus?: boolean;
} | null;

function verifiedDateLabel(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
type FeedPost = {
  id: string;
  authorName: string;
  authorHeadline: string | null;
  bodyMarkdown: string;
  createdAt: string;
  peerSignal: number;
};
type Attachment = {
  id?: string;
  url: string;
  kind: 'IMAGE' | 'LINK' | 'DOCUMENT' | 'PORTFOLIO';
  label: string | null;
  altText: string | null;
};
type Conversation = {
  id: string;
  counterpart: { id: string; slug: string; fullName: string; headline: string | null };
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
  muted: boolean;
};
type Message = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  seenAt: string | null;
  attachments: Attachment[];
};
type View = 'home' | 'network' | 'messages' | 'activity' | 'jobs' | 'organizations';
type AppStatus = 'connecting' | 'signed-out' | 'ready' | 'error';

const views: Array<{ id: View; label: string; icon: string; shortcut: string }> = [
  { id: 'home', label: 'Home', icon: '⌂', shortcut: 'H' },
  { id: 'network', label: 'Network', icon: '◎', shortcut: 'N' },
  { id: 'messages', label: 'Messages', icon: '✦', shortcut: 'M' },
  { id: 'activity', label: 'Activity', icon: '◌', shortcut: 'A' },
  { id: 'jobs', label: 'Jobs', icon: '▣', shortcut: 'J' },
  { id: 'organizations', label: 'Organizations', icon: '◇', shortcut: 'O' },
];

function initials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(value),
  );
}
function formatDate(value: string) {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? formatTime(value)
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}
function webRoute(view: View) {
  return view === 'network'
    ? '/mynetwork'
    : view === 'activity'
      ? '/notifications'
      : view === 'organizations'
        ? '/search?type=companies'
        : `/${view}`;
}

export function App() {
  const [profile, setProfile] = useState<Profile>(null);
  const [view, setView] = useState<View>('home');
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composer, setComposer] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [status, setStatus] = useState<AppStatus>('connecting');
  const [notice, setNotice] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );
  const unreadCount = conversations.reduce((total, item) => total + item.unreadCount, 0);
  const commandItems = useMemo(
    () => views.filter((item) => item.label.toLowerCase().includes(commandQuery.toLowerCase())),
    [commandQuery],
  );

  async function restore() {
    setStatus('connecting');
    setNotice(null);
    try {
      const currentProfile = await invoke<Profile>('desktop_restore_session');
      setProfile(currentProfile);
      if (currentProfile === null) {
        setStatus('signed-out');
        return;
      }
      const [feedPayload, conversationPayload] = await Promise.all([
        invoke<{ posts: FeedPost[] }>('desktop_feed'),
        invoke<{ conversations: Conversation[] }>('desktop_conversations'),
      ]);
      setFeed(feedPayload.posts);
      setConversations(conversationPayload.conversations);
      setSelectedConversationId(
        (current) => current ?? conversationPayload.conversations[0]?.id ?? null,
      );
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setNotice(error instanceof Error ? error.message : 'We could not reconnect this device.');
    }
  }
  useEffect(() => {
    void restore();
  }, []);
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onOpenUrl((urls) => {
      if (urls[0]) void finishAuthentication(urls[0]);
    }).then((listener) => {
      unlisten = listener;
    });
    return () => unlisten?.();
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    if (!selectedConversationId || view !== 'messages' || status !== 'ready') return;
    setMessageLoading(true);
    setNotice(null);
    void invoke<{ messages: Message[] }>('desktop_messages', {
      conversationId: selectedConversationId,
    })
      .then((payload) => {
        setMessages(payload.messages);
        setConversations((current) =>
          current.map((item) =>
            item.id === selectedConversationId ? { ...item, unreadCount: 0 } : item,
          ),
        );
      })
      .catch((error: unknown) =>
        setNotice(
          error instanceof Error ? error.message : 'This conversation could not be loaded.',
        ),
      )
      .finally(() => setMessageLoading(false));
  }, [selectedConversationId, status, view]);

  async function startAuthentication() {
    setNotice(null);
    try {
      await openUrl(await invoke<string>('desktop_begin_authentication'));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Your browser could not be opened.');
    }
  }
  async function finishAuthentication(callbackUrl: string) {
    try {
      setStatus('connecting');
      setProfile(await invoke<Profile>('desktop_complete_authentication', { callbackUrl }));
      await restore();
    } catch (error) {
      setStatus('error');
      setNotice(
        error instanceof Error ? error.message : 'The desktop sign-in could not be completed.',
      );
    }
  }
  async function openWeb(path: string) {
    await openUrl(`https://vouchnet.dev${path}`);
  }
  async function signOut() {
    await invoke('desktop_sign_out');
    setProfile(null);
    setFeed([]);
    setConversations([]);
    setMessages([]);
    setStatus('signed-out');
  }
  async function sendMessage() {
    if (!selectedConversationId || sending || (!composer.trim() && !attachments.length)) return;
    setSending(true);
    const body = composer.trim();
    const pending = attachments;
    setComposer('');
    setAttachments([]);
    try {
      const payload = await invoke<{ message: Message }>('desktop_send_message', {
        conversationId: selectedConversationId,
        body,
        attachments: pending,
      });
      setMessages((current) => [...current, payload.message]);
      setConversations((current) =>
        current.map((item) =>
          item.id === selectedConversationId
            ? {
                ...item,
                lastMessage: {
                  body: payload.message.body || 'Shared an attachment',
                  createdAt: payload.message.createdAt,
                  senderId: profile?.slug ?? '',
                },
              }
            : item,
        ),
      );
    } catch (error) {
      setComposer(body);
      setAttachments(pending);
      setNotice(error instanceof Error ? error.message : 'Your message could not be sent.');
    } finally {
      setSending(false);
    }
  }
  function addAttachment() {
    try {
      const url = new URL(attachmentUrl.trim());
      if (url.protocol !== 'https:' || attachments.length >= 4) throw new Error();
      setAttachments((current) => [
        ...current,
        { url: url.toString(), kind: 'LINK', label: null, altText: null },
      ]);
      setAttachmentUrl('');
    } catch {
      setNotice('Add an HTTPS link. Portfolios, documents, and image links are supported.');
    }
  }

  if (status === 'connecting') return <Splash />;
  if (status === 'signed-out')
    return <Welcome onContinue={() => void startAuthentication()} message={notice} />;
  if (status === 'error')
    return (
      <main className="recovery-screen">
        <div className="brand-orb">V</div>
        <p className="eyebrow">Desktop connection</p>
        <h1>Let’s get this device back in sync.</h1>
        <p>{notice ?? 'VouchNet could not restore this device session.'}</p>
        <div className="recovery-actions">
          <button className="button-primary" onClick={() => void restore()} type="button">
            Retry connection
          </button>
          <button className="button-quiet" onClick={() => void startAuthentication()} type="button">
            Sign in again
          </button>
        </div>
      </main>
    );

  return (
    <main className="desktop-shell">
      <nav className="app-rail" aria-label="Primary navigation">
        <button
          className="brand-orb brand-button"
          onClick={() => setView('home')}
          title="VouchNet home"
          type="button"
        >
          V
        </button>
        <div className="rail-main">
          {views.map((item) => (
            <button
              aria-current={view === item.id ? 'page' : undefined}
              className={view === item.id ? 'rail-item active' : 'rail-item'}
              key={item.id}
              onClick={() => setView(item.id)}
              title={item.label}
              type="button"
            >
              <span>{item.icon}</span>
              {item.id === 'messages' && unreadCount ? <i>{unreadCount}</i> : null}
              <small>{item.label}</small>
            </button>
          ))}
        </div>
        <button
          className="rail-avatar"
          onClick={() => setCommandOpen(true)}
          title="Open command palette"
          type="button"
        >
          {profile?.fullName ? initials(profile.fullName) : 'V'}
        </button>
      </nav>
      <aside className="workspace-sidebar">
        <header className="workspace-header">
          <div className="profile-avatar">
            {profile?.fullName ? initials(profile.fullName) : 'V'}
          </div>
          <div>
            <strong>
              {profile?.fullName ?? 'VouchNet member'}
              {profile?.identityVerification ? (
                <span
                  className="desktop-verified-badge"
                  title={`Identity verified · ${profile.identityVerification.method} · ${verifiedDateLabel(profile.identityVerification.verifiedAt)}`}
                >
                  ✓ Identity Verified
                </span>
              ) : null}
              {profile?.earlyMember ? (
                <span className="desktop-early-badge" title="Joined during the early invite wave">
                  ✦ Early member
                </span>
              ) : null}
              {profile?.isPlus ? (
                <span
                  className="desktop-plus-badge"
                  title="VouchNet+ active across web and desktop"
                >
                  VouchNet+
                </span>
              ) : null}
            </strong>
            <span>{profile?.headline ?? 'Your professional network'}</span>
            {profile?.hourlyRateVisible && profile.hourlyRateAmount ? (
              <span className="desktop-rate">
                ${profile.hourlyRateAmount} {profile.hourlyRateCurrency}/hr
              </span>
            ) : null}
            {profile?.services && profile.services.length > 0 ? (
              <span className="desktop-services">
                {profile.services
                  .slice(0, 3)
                  .map((service) => service.title)
                  .join(' · ')}
                {profile.services.length > 3 ? ` +${profile.services.length - 3}` : ''}
              </span>
            ) : null}
          </div>
          <i className="connection-dot" title="Secure device session" />
        </header>
        <div className="sidebar-section">
          <p>Workspace</p>
          {views.map((item) => (
            <button
              className={view === item.id ? 'sidebar-link selected' : 'sidebar-link'}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              <span>{item.icon}</span>
              {item.label}
              <kbd>{item.shortcut}</kbd>
            </button>
          ))}
        </div>
        <div className="sidebar-spacer" />
        <section className="desktop-sync-card">
          <span>●</span>
          <strong>Synced securely</strong>
          <p>Your VouchNet account is connected to this Windows device.</p>
          <button onClick={() => void openWeb(`/vouch/${profile?.slug ?? ''}`)} type="button">
            View my profile ↗
          </button>
        </section>
        <button
          className="create-control"
          onClick={() => void openWeb('/feed/create')}
          type="button"
        >
          <span>＋</span> Create post
        </button>
      </aside>
      <section className="desktop-stage">
        <header className="stage-header">
          <div>
            <p className="eyebrow">
              {view === 'home' ? 'Your signal desk' : views.find((item) => item.id === view)?.label}
            </p>
            <h1>
              {view === 'home' ? 'Good to see you.' : views.find((item) => item.id === view)?.label}
            </h1>
          </div>
          <div className="stage-actions">
            <button className="command-trigger" onClick={() => setCommandOpen(true)} type="button">
              <span>⌕</span> Search VouchNet <kbd>Ctrl K</kbd>
            </button>
            <button
              className="icon-control"
              onClick={() => setView('activity')}
              title="Activity"
              type="button"
            >
              ◌
            </button>
          </div>
        </header>
        {notice ? <p className="inline-notice">{notice}</p> : null}
        {view === 'home' ? (
          <HomeView
            feed={feed}
            onCompose={() => void openWeb('/feed/create')}
            onOpenPost={(id) => void openWeb(`/feed?post=${id}`)}
          />
        ) : view === 'messages' ? (
          <MessagesView
            attachments={attachments}
            attachmentUrl={attachmentUrl}
            composer={composer}
            conversations={conversations}
            currentUserName={profile?.fullName ?? 'You'}
            loading={messageLoading}
            messages={messages}
            onAddAttachment={addAttachment}
            onAttachmentUrlChange={setAttachmentUrl}
            onComposerChange={setComposer}
            onRemoveAttachment={(url) =>
              setAttachments((current) => current.filter((item) => item.url !== url))
            }
            onSelectConversation={setSelectedConversationId}
            onSend={() => void sendMessage()}
            onViewProfile={(slug) => void openWeb(`/vouch/${slug}`)}
            selectedConversation={selectedConversation}
            selectedConversationId={selectedConversationId}
            sending={sending}
          />
        ) : (
          <NativeSurface
            title={views.find((item) => item.id === view)?.label ?? 'VouchNet'}
            view={view}
            onOpen={() => void openWeb(webRoute(view))}
          />
        )}
      </section>
      <aside className="context-pane">
        <section
          className={
            profile?.isPlus ? 'context-panel premium-panel active' : 'context-panel premium-panel'
          }
        >
          <div className="context-icon">V+</div>
          <p className="eyebrow">VouchNet+</p>
          <h2>
            {profile?.isPlus ? 'Your Plus signal is active.' : 'Make the network work harder.'}
          </h2>
          <p>
            {profile?.isPlus
              ? 'Advanced analytics, featured proof, priority outreach, and feed controls are synced to this desktop device.'
              : 'VouchNet stays free. Plus adds advanced signal tools on the web and every connected desktop device.'}
          </p>
          <button
            className="premium-action"
            onClick={() => void openWeb('/settings/account')}
            type="button"
          >
            {profile?.isPlus ? 'Manage VouchNet+' : 'Explore VouchNet+'}
          </button>
        </section>
        <section className="context-panel">
          <div className="context-heading">
            <span>◉</span>
            <h2>Today on VouchNet</h2>
          </div>
          <ul className="signal-list">
            <li>
              <b>01</b>
              <span>
                <strong>Signal-first feed</strong>
                <small>Chronological by default</small>
              </span>
            </li>
            <li>
              <b>02</b>
              <span>
                <strong>Proof-of-work profiles</strong>
                <small>Show the useful details</small>
              </span>
            </li>
            <li>
              <b>03</b>
              <span>
                <strong>Transparent roles</strong>
                <small>Salary-forward job discovery</small>
              </span>
            </li>
          </ul>
        </section>
        <section className="context-panel device-panel">
          <span>⌁</span>
          <div>
            <strong>This device is protected</strong>
            <p>Credentials are stored outside the app in Windows Credential Manager.</p>
          </div>
        </section>
        <button className="signout-control" onClick={() => void signOut()} type="button">
          Sign out of this device
        </button>
      </aside>
      {commandOpen ? (
        <div className="command-backdrop" onMouseDown={() => setCommandOpen(false)}>
          <section
            aria-label="VouchNet command palette"
            className="command-palette"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="command-search">
              <span>⌕</span>
              <input
                autoFocus
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Search commands and spaces…"
                value={commandQuery}
              />
            </div>
            <p className="command-label">Navigate</p>
            {commandItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setCommandOpen(false);
                }}
                type="button"
              >
                <span>{item.icon}</span> Open {item.label}
                <kbd>{item.shortcut}</kbd>
              </button>
            ))}
            <p className="command-footer">Esc to close</p>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function Splash() {
  return (
    <main className="desktop-splash">
      <div className="splash-grid" />
      <div className="splash-content">
        <div className="brand-orb">V</div>
        <p className="eyebrow">VouchNet Desktop</p>
        <h1>Connecting your workspace</h1>
        <div className="loading-line">
          <i />
        </div>
        <p>Restoring your secure device session…</p>
      </div>
    </main>
  );
}
function Welcome({ onContinue, message }: { onContinue: () => void; message: string | null }) {
  return (
    <main className="desktop-welcome">
      <div className="welcome-glow" />
      <section className="welcome-card">
        <div className="brand-orb">V</div>
        <p className="eyebrow">VouchNet Desktop</p>
        <h1>
          Your network,
          <br />
          <em>closer.</em>
        </h1>
        <p>
          Bring the professional network you already use into a focused desktop workspace—with the
          same account, data, and privacy controls.
        </p>
        <button className="button-primary" onClick={onContinue} type="button">
          Continue securely in your browser <span>↗</span>
        </button>
        {message ? <p className="welcome-error">{message}</p> : null}
        <div className="welcome-trust">
          <span>⌁</span>
          <p>Uses your existing VouchNet account. This app never receives your browser session.</p>
        </div>
        <button
          className="welcome-signup"
          onClick={() => void openUrl('https://vouchnet.dev/signup')}
          type="button"
        >
          New to VouchNet? Create an account →
        </button>
      </section>
      <aside className="welcome-preview">
        <div className="preview-window">
          <header>
            <span />
            <span />
            <span />
            <b>VouchNet</b>
          </header>
          <div className="preview-content">
            <div className="preview-rail">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div>
              <p>YOUR SIGNAL DESK</p>
              <h2>
                Work worth
                <br />
                seeing.
              </h2>
              <article>
                <span />
                <div>
                  <b>Peer-verified work</b>
                  <small>Built for signal, not noise.</small>
                </div>
              </article>
              <article>
                <span />
                <div>
                  <b>Keep the context</b>
                  <small>Messages, posts, and opportunities.</small>
                </div>
              </article>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
function HomeView({
  feed,
  onCompose,
  onOpenPost,
}: {
  feed: FeedPost[];
  onCompose: () => void;
  onOpenPost: (id: string) => void;
}) {
  return (
    <div className="home-layout">
      <section className="feed-column">
        <button className="desktop-composer" onClick={onCompose} type="button">
          <span className="composer-avatar">＋</span>
          <span>
            <b>Share a useful post</b>
            <small>Technical notes, project progress, or a considered point of view.</small>
          </span>
          <i>↗</i>
        </button>
        <div className="feed-heading">
          <div>
            <p className="eyebrow">Feed</p>
            <h2>Useful work from your network</h2>
          </div>
          <span className="live-label">
            <i /> Live
          </span>
        </div>
        <div className="desktop-feed">
          {feed.length === 0 ? (
            <article className="empty-feed">
              <span>⌁</span>
              <h3>Your feed is ready for useful work.</h3>
              <p>
                Follow people, publish a post, or use Discover to tune this space to your
                professional interests.
              </p>
              <button onClick={onCompose} type="button">
                Create your first post
              </button>
            </article>
          ) : (
            feed.map((post) => (
              <article className="post-card" key={post.id}>
                <header>
                  <span className="post-avatar">{initials(post.authorName)}</span>
                  <div>
                    <strong>{post.authorName}</strong>
                    <small>
                      {post.authorHeadline ?? 'VouchNet member'} · {formatDate(post.createdAt)}
                    </small>
                  </div>
                  <button onClick={() => onOpenPost(post.id)} type="button">
                    •••
                  </button>
                </header>
                <p>{post.bodyMarkdown}</p>
                <footer>
                  <span>⌁ {post.peerSignal} verified signal</span>
                  <button onClick={() => onOpenPost(post.id)} type="button">
                    Open discussion →
                  </button>
                </footer>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function MessagesView(props: {
  conversations: Conversation[];
  selectedConversationId: string | null;
  selectedConversation: Conversation | null;
  messages: Message[];
  currentUserName: string;
  composer: string;
  attachments: Attachment[];
  attachmentUrl: string;
  loading: boolean;
  sending: boolean;
  onSelectConversation: (id: string) => void;
  onComposerChange: (value: string) => void;
  onAttachmentUrlChange: (value: string) => void;
  onAddAttachment: () => void;
  onRemoveAttachment: (url: string) => void;
  onSend: () => void;
  onViewProfile: (slug: string) => void;
}) {
  const {
    conversations,
    selectedConversationId,
    selectedConversation,
    messages,
    currentUserName,
    composer,
    attachments,
    attachmentUrl,
    loading,
    sending,
    onSelectConversation,
    onComposerChange,
    onAttachmentUrlChange,
    onAddAttachment,
    onRemoveAttachment,
    onSend,
    onViewProfile,
  } = props;
  return (
    <section className="messages-surface">
      <aside className="conversation-list">
        <div className="conversation-list-header">
          <div>
            <p className="eyebrow">Inbox</p>
            <h2>Messages</h2>
          </div>
          <span>{conversations.reduce((total, item) => total + item.unreadCount, 0)} unread</span>
        </div>
        <div className="thread-search">
          ⌕ <input placeholder="Search conversations" />
        </div>
        {conversations.length === 0 ? (
          <div className="conversation-empty">
            <span>✦</span>
            <h3>No conversations yet</h3>
            <p>Once a contact opens a thread, your desktop inbox will stay in sync.</p>
          </div>
        ) : (
          <div className="threads">
            {conversations.map((conversation) => (
              <button
                className={
                  conversation.id === selectedConversationId ? 'thread active-thread' : 'thread'
                }
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                type="button"
              >
                <span className="thread-avatar">{initials(conversation.counterpart.fullName)}</span>
                <span>
                  <b>{conversation.counterpart.fullName}</b>
                  <small>
                    {conversation.lastMessage?.body ||
                      conversation.counterpart.headline ||
                      'Start a conversation'}
                  </small>
                </span>
                <i>
                  {conversation.unreadCount
                    ? conversation.unreadCount
                    : conversation.lastMessage
                      ? formatDate(conversation.lastMessage.createdAt)
                      : ''}
                </i>
              </button>
            ))}
          </div>
        )}
      </aside>
      <section className="thread-canvas">
        {selectedConversation === null ? (
          <div className="message-welcome">
            <span>✦</span>
            <h2>Select a conversation</h2>
            <p>Your messages sync from the same VouchNet account you use on the web.</p>
          </div>
        ) : (
          <>
            <header className="thread-header">
              <div className="thread-avatar large">
                {initials(selectedConversation.counterpart.fullName)}
              </div>
              <div>
                <h2>{selectedConversation.counterpart.fullName}</h2>
                <p>
                  {selectedConversation.counterpart.headline ?? 'VouchNet member'} <i /> Active on
                  VouchNet
                </p>
              </div>
              <button
                onClick={() => onViewProfile(selectedConversation.counterpart.slug)}
                type="button"
              >
                View profile ↗
              </button>
            </header>
            <div className="message-stream">
              {loading ? (
                <div className="message-loading">
                  <i />
                  <i />
                  <i />
                </div>
              ) : messages.length === 0 ? (
                <div className="conversation-empty centered">
                  <span>✦</span>
                  <h3>Start the conversation</h3>
                  <p>Your message will arrive in their VouchNet inbox.</p>
                </div>
              ) : (
                messages.map((message) => {
                  const mine = message.senderName === currentUserName;
                  return (
                    <article
                      className={mine ? 'message-bubble own' : 'message-bubble'}
                      key={message.id}
                    >
                      <p>{message.body}</p>
                      {message.attachments.map((attachment) => (
                        <a
                          href={attachment.url}
                          key={attachment.id ?? attachment.url}
                          onClick={(event) => {
                            event.preventDefault();
                            void openUrl(attachment.url);
                          }}
                        >
                          {attachment.kind === 'PORTFOLIO' ? '◈' : '↗'}{' '}
                          {attachment.label ?? 'Open shared link'}
                        </a>
                      ))}
                      <small>
                        {formatTime(message.createdAt)}{' '}
                        {mine ? (
                          <b title={message.seenAt ? 'Seen' : 'Delivered'}>
                            {message.seenAt ? '✓✓' : '✓'}
                          </b>
                        ) : null}
                      </small>
                    </article>
                  );
                })
              )}
            </div>
            <footer className="message-composer">
              {attachments.length ? (
                <div className="attachment-chips">
                  {attachments.map((attachment) => (
                    <button
                      key={attachment.url}
                      onClick={() => onRemoveAttachment(attachment.url)}
                      type="button"
                    >
                      ↗ {new URL(attachment.url).hostname} ×
                    </button>
                  ))}
                </div>
              ) : null}
              <textarea
                onChange={(event) => onComposerChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    onSend();
                  }
                }}
                placeholder={`Message ${selectedConversation.counterpart.fullName}…`}
                value={composer}
              />
              <div className="message-tools">
                <div>
                  <input
                    aria-label="Attach a secure HTTPS link"
                    onChange={(event) => onAttachmentUrlChange(event.target.value)}
                    placeholder="Attach link"
                    value={attachmentUrl}
                  />
                  <button onClick={onAddAttachment} type="button">
                    Add
                  </button>
                </div>
                <span>Enter to send · Shift + Enter for line break</span>
                <button
                  className="send-button"
                  disabled={sending || (!composer.trim() && !attachments.length)}
                  onClick={onSend}
                  type="button"
                >
                  {sending ? 'Sending…' : 'Send ↗'}
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </section>
  );
}

function NativeSurface({ title, view, onOpen }: { title: string; view: View; onOpen: () => void }) {
  const content: Record<
    Exclude<View, 'home' | 'messages'>,
    { eyebrow: string; heading: string; body: string; action: string }
  > = {
    network: {
      eyebrow: 'Professional graph',
      heading: 'Build a network with context.',
      body: 'Discover people through shared work, clear professional details, and explanations—not noisy suggestions.',
      action: 'Explore your network',
    },
    activity: {
      eyebrow: 'Your activity',
      heading: 'Useful updates stay visible.',
      body: 'VouchNet keeps activity purposeful: direct messages, application movement, verified work, and security signals.',
      action: 'Open activity',
    },
    jobs: {
      eyebrow: 'Transparent opportunities',
      heading: 'Know the work before you apply.',
      body: 'Browse salary-forward opportunities and manage applications with your VouchNet profile as the source of truth.',
      action: 'Explore jobs',
    },
    organizations: {
      eyebrow: 'Verified organizations',
      heading: 'Meet the team behind the work.',
      body: 'Explore company context, public technical culture, roles, and verified organization information.',
      action: 'Explore organizations',
    },
  };
  const item = content[view as Exclude<View, 'home' | 'messages'>];
  return (
    <section className="native-surface">
      <div className="native-glyph">{views.find((entry) => entry.id === view)?.icon}</div>
      <p className="eyebrow">{item.eyebrow}</p>
      <h2>{item.heading}</h2>
      <p>{item.body}</p>
      <button className="button-primary" onClick={onOpen} type="button">
        {item.action} <span>↗</span>
      </button>
      <small>
        {title} is opened in the full VouchNet workspace to keep desktop and web data unified.
      </small>
    </section>
  );
}
