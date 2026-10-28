import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
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

type FeedPost = {
  id: string;
  authorName: string;
  authorHeadline: string | null;
  bodyMarkdown: string;
  createdAt: string;
  peerSignal: number;
};
type DiscoveryJob = {
  slug: string;
  title: string;
  organizationName: string;
  organizationSlug: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  skillTags: string[];
};
type DiscoveryOrganization = {
  slug: string;
  name: string;
  tagline: string | null;
  technologies: string[];
  openRoleCount: number;
};
type FeedDiscovery = {
  jobs: DiscoveryJob[];
  organizations: DiscoveryOrganization[];
  topics: string[];
  dailyChallenge: { title: string; difficultyLabel: string; moveBudget: number };
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
type ActivityItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};
type NetworkInvitation = {
  connectionId: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  slug: string;
};
type NetworkPerson = {
  userId: string;
  slug: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  mutualContacts: number;
  score: number;
  reasons: string[];
};
type NetworkPayload = {
  overview: {
    contactCount: number;
    followingCount: number;
    pendingReceivedCount: number;
    pendingReceived: NetworkInvitation[];
  };
  recommendations: NetworkPerson[];
};
type DirectoryJob = DiscoveryJob & {
  summary?: string;
  workplaceType?: string;
  employmentType?: string;
  sourceStatus?: string;
};
type DirectoryOrganization = {
  slug: string;
  name: string;
  tagline: string | null;
  headquarters?: string | null;
  verificationStatus?: string;
  technologies: string[];
  openRoleCount?: number;
};
type OpportunityCard = {
  id: string;
  slug: string;
  type: string;
  title: string;
  summary: string;
  lookingFor: string;
  location: string | null;
  remote: boolean;
  tags: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  budgetCurrency: string;
  proposalCount: number;
  poster: { slug: string; name: string; headline: string | null };
  project: { slug: string; name: string } | null;
  createdAt: string;
};
type SavedPost = {
  id: string;
  authorName: string;
  authorSlug: string;
  authorHeadline: string | null;
  bodyMarkdown: string;
  category: string;
  peerSignal: number;
  commentCount: number;
  createdAt: string;
  savedAt: string;
};
type SearchResults = {
  query: string;
  people: Array<{
    userId: string;
    slug: string;
    fullName: string;
    headline: string | null;
    location: string | null;
    isPlus: boolean;
  }>;
  jobs: DiscoveryJob[];
  organizations: DirectoryOrganization[];
};
type View =
  'home' | 'network' | 'messages' | 'activity' | 'jobs' | 'organizations' | 'discover' | 'saved';
type AppStatus = 'connecting' | 'signed-out' | 'ready' | 'error';

const views: Array<{ id: View; label: string; icon: string; shortcut: string }> = [
  { id: 'home', label: 'Home', icon: '⌂', shortcut: 'H' },
  { id: 'network', label: 'Network', icon: '◎', shortcut: 'N' },
  { id: 'messages', label: 'Messages', icon: '✦', shortcut: 'M' },
  { id: 'activity', label: 'Activity', icon: '◌', shortcut: 'A' },
  { id: 'jobs', label: 'Jobs', icon: '▣', shortcut: 'J' },
  { id: 'organizations', label: 'Organizations', icon: '◇', shortcut: 'O' },
  { id: 'discover', label: 'Opportunities', icon: '◈', shortcut: 'D' },
  { id: 'saved', label: 'Saved', icon: '☆', shortcut: 'S' },
];

function verifiedDateLabel(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
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
function formatSalary(job: DiscoveryJob) {
  if (job.salaryMin === null && job.salaryMax === null) return 'Compensation on source';
  const currency = job.salaryCurrency || 'USD';
  const format = (amount: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  if (job.salaryMin !== null && job.salaryMax !== null) {
    return `${format(job.salaryMin)}–${format(job.salaryMax)}`;
  }
  return format(job.salaryMin ?? job.salaryMax ?? 0);
}
function emptySearch(): SearchResults {
  return { query: '', people: [], jobs: [], organizations: [] };
}
function emptyNetwork(): NetworkPayload {
  return {
    overview: {
      contactCount: 0,
      followingCount: 0,
      pendingReceivedCount: 0,
      pendingReceived: [],
    },
    recommendations: [],
  };
}
function emptyDiscovery(): FeedDiscovery {
  return {
    jobs: [],
    organizations: [],
    topics: [],
    dailyChallenge: { title: 'Signal Circuit', difficultyLabel: 'Steady', moveBudget: 12 },
  };
}

export function App() {
  const [profile, setProfile] = useState<Profile>(null);
  const [view, setView] = useState<View>('home');
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [discovery, setDiscovery] = useState<FeedDiscovery>(emptyDiscovery());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [network, setNetwork] = useState<NetworkPayload>(emptyNetwork());
  const [directoryJobs, setDirectoryJobs] = useState<DirectoryJob[]>([]);
  const [directoryOrganizations, setDirectoryOrganizations] = useState<DirectoryOrganization[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityCard[]>([]);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResults>(emptySearch());
  const [composer, setComposer] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [status, setStatus] = useState<AppStatus>('connecting');
  const [notice, setNotice] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [threadQuery, setThreadQuery] = useState('');
  const [jobsQuery, setJobsQuery] = useState('');
  const [opportunityQuery, setOpportunityQuery] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const knownUnreadRef = useRef(0);
  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );
  const unreadCount = conversations.reduce((total, item) => total + item.unreadCount, 0);
  const unreadActivity = activity.filter((item) => item.readAt === null).length;
  const filteredConversations = useMemo(() => {
    const query = threadQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const haystack = [
        conversation.counterpart.fullName,
        conversation.counterpart.headline ?? '',
        conversation.lastMessage?.body ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [conversations, threadQuery]);
  const commandItems = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    const navigation = views.filter((item) => item.label.toLowerCase().includes(query));
    const extras = [
      { id: 'compose', label: 'Create a post', icon: '＋', path: '/feed/create' },
      { id: 'profile', label: 'Open my profile', icon: '◉', path: `/vouch/${profile?.slug ?? ''}` },
      { id: 'games', label: 'Play today’s puzzle', icon: '▦', path: '/games' },
      { id: 'settings', label: 'Account settings', icon: '⚙', path: '/settings/account' },
      { id: 'web-search', label: 'Open web search', icon: '⌕', path: '/search' },
    ].filter((item) => item.label.toLowerCase().includes(query));
    return { navigation, extras };
  }, [commandQuery, profile?.slug]);

  async function notifyUnread(count: number) {
    if (count <= knownUnreadRef.current) {
      knownUnreadRef.current = count;
      return;
    }
    knownUnreadRef.current = count;
    try {
      let granted = await isPermissionGranted();
      if (!granted) granted = (await requestPermission()) === 'granted';
      if (!granted) return;
      await sendNotification({
        title: 'VouchNet',
        body: count === 1 ? 'You have a new message.' : `You have ${count} unread messages.`,
      });
    } catch {
      // Notifications are optional on locked-down Windows installs.
    }
  }

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
      const [feedPayload, conversationPayload, activityPayload] = await Promise.all([
        invoke<{ posts: FeedPost[]; discovery?: FeedDiscovery }>('desktop_feed'),
        invoke<{ conversations: Conversation[] }>('desktop_conversations'),
        invoke<{ notifications: ActivityItem[] }>('desktop_activity').catch(() => ({
          notifications: [] as ActivityItem[],
        })),
      ]);
      setFeed(feedPayload.posts);
      setDiscovery(feedPayload.discovery ?? emptyDiscovery());
      setConversations(conversationPayload.conversations);
      setActivity(activityPayload.notifications);
      setDirectoryJobs(feedPayload.discovery?.jobs ?? []);
      setDirectoryOrganizations(feedPayload.discovery?.organizations ?? []);
      setSelectedConversationId(
        (current) => current ?? conversationPayload.conversations[0]?.id ?? null,
      );
      const nextUnread = conversationPayload.conversations.reduce(
        (total, item) => total + item.unreadCount,
        0,
      );
      void notifyUnread(nextUnread);
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
        return;
      }
      if (event.key === 'Escape') {
        setCommandOpen(false);
        return;
      }
      if (commandOpen || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const match = views.find((item) => item.shortcut.toLowerCase() === event.key.toLowerCase());
      if (match) {
        event.preventDefault();
        setView(match.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandOpen]);
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
  useEffect(() => {
    if (view !== 'activity' || status !== 'ready') return;
    setActivityLoading(true);
    void invoke<{ notifications: ActivityItem[] }>('desktop_activity')
      .then((payload) => setActivity(payload.notifications))
      .catch((error: unknown) =>
        setNotice(error instanceof Error ? error.message : 'Activity could not be refreshed.'),
      )
      .finally(() => setActivityLoading(false));
  }, [status, view]);
  useEffect(() => {
    if (view !== 'network' || status !== 'ready') return;
    setNetworkLoading(true);
    void invoke<NetworkPayload>('desktop_network')
      .then((payload) => setNetwork(payload))
      .catch((error: unknown) =>
        setNotice(error instanceof Error ? error.message : 'Network could not be loaded.'),
      )
      .finally(() => setNetworkLoading(false));
  }, [status, view]);
  useEffect(() => {
    if ((view !== 'jobs' && view !== 'organizations') || status !== 'ready') return;
    setJobsLoading(true);
    void invoke<{ jobs: DirectoryJob[]; organizations: DirectoryOrganization[] }>('desktop_jobs', {
      query: jobsQuery.trim() || null,
    })
      .then((payload) => {
        setDirectoryJobs(payload.jobs);
        setDirectoryOrganizations(payload.organizations);
      })
      .catch((error: unknown) =>
        setNotice(error instanceof Error ? error.message : 'Jobs directory could not be loaded.'),
      )
      .finally(() => setJobsLoading(false));
  }, [jobsQuery, status, view]);
  useEffect(() => {
    if (view !== 'discover' || status !== 'ready') return;
    setOpportunitiesLoading(true);
    void invoke<{ opportunities: OpportunityCard[] }>('desktop_opportunities', {
      query: opportunityQuery.trim() || null,
      remoteOnly,
    })
      .then((payload) => setOpportunities(payload.opportunities))
      .catch((error: unknown) =>
        setNotice(error instanceof Error ? error.message : 'Opportunities could not be loaded.'),
      )
      .finally(() => setOpportunitiesLoading(false));
  }, [opportunityQuery, remoteOnly, status, view]);
  useEffect(() => {
    if (view !== 'saved' || status !== 'ready') return;
    setSavedLoading(true);
    void invoke<{ posts: SavedPost[] }>('desktop_saved')
      .then((payload) => setSavedPosts(payload.posts))
      .catch((error: unknown) =>
        setNotice(error instanceof Error ? error.message : 'Saved posts could not be loaded.'),
      )
      .finally(() => setSavedLoading(false));
  }, [status, view]);
  useEffect(() => {
    if (!commandOpen || status !== 'ready') return;
    const query = commandQuery.trim();
    if (query.length < 2) {
      setSearchResults(emptySearch());
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      void invoke<SearchResults>('desktop_search', { query })
        .then((payload) => setSearchResults(payload))
        .catch(() => setSearchResults(emptySearch()))
        .finally(() => setSearchLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [commandOpen, commandQuery, status]);
  useEffect(() => {
    if (status !== 'ready') return;
    const timer = window.setInterval(() => {
      void invoke<{ conversations: Conversation[] }>('desktop_conversations')
        .then((payload) => {
          setConversations(payload.conversations);
          const nextUnread = payload.conversations.reduce(
            (total, item) => total + item.unreadCount,
            0,
          );
          void notifyUnread(nextUnread);
        })
        .catch(() => undefined);
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [status]);

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
    setDiscovery(emptyDiscovery());
    setConversations([]);
    setMessages([]);
    setActivity([]);
    setNetwork(emptyNetwork());
    setDirectoryJobs([]);
    setDirectoryOrganizations([]);
    setOpportunities([]);
    setSavedPosts([]);
    setSearchResults(emptySearch());
    knownUnreadRef.current = 0;
    setStatus('signed-out');
  }
  async function connectWith(userId: string) {
    try {
      await invoke('desktop_connect', { payload: { targetUserId: userId } });
      setNetwork((current) => ({
        ...current,
        recommendations: current.recommendations.filter((person) => person.userId !== userId),
      }));
      setNotice('Connection request sent.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Connection request failed.');
    }
  }
  async function respondInvitation(connectionId: string, action: 'accept' | 'decline') {
    try {
      await invoke('desktop_connect', { payload: { connectionId, action } });
      setNetwork((current) => ({
        ...current,
        overview: {
          ...current.overview,
          pendingReceived: current.overview.pendingReceived.filter(
            (item) => item.connectionId !== connectionId,
          ),
          pendingReceivedCount: Math.max(0, current.overview.pendingReceivedCount - 1),
          contactCount:
            action === 'accept' ? current.overview.contactCount + 1 : current.overview.contactCount,
        },
      }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Invitation could not be updated.');
    }
  }
  async function unsavePost(postId: string) {
    try {
      await invoke('desktop_unsave_post', { postId });
      setSavedPosts((current) => current.filter((post) => post.id !== postId));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not remove that saved post.');
    }
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
  async function openActivity(item: ActivityItem) {
    setActivity((current) =>
      current.map((entry) =>
        entry.id === item.id && entry.readAt === null
          ? { ...entry, readAt: new Date().toISOString() }
          : entry,
      ),
    );
    try {
      await invoke('desktop_mark_activity_read', { notificationId: item.id });
    } catch {
      // Opening the linked surface still helps even if the read marker fails.
    }
    await openWeb(item.href);
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
              title={`${item.label} (${item.shortcut})`}
              type="button"
            >
              <span>{item.icon}</span>
              {item.id === 'messages' && unreadCount ? <i>{unreadCount}</i> : null}
              {item.id === 'activity' && unreadActivity ? <i>{unreadActivity}</i> : null}
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
              {view === 'home'
                ? 'Good to see you.'
                : (views.find((item) => item.id === view)?.label ?? 'VouchNet')}
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
              ◌{unreadActivity ? <i>{unreadActivity}</i> : null}
            </button>
          </div>
        </header>
        {notice ? <p className="inline-notice">{notice}</p> : null}
        {view === 'home' ? (
          <HomeView
            challenge={discovery.dailyChallenge}
            feed={feed}
            jobs={discovery.jobs}
            onCompose={() => void openWeb('/feed/create')}
            onOpenChallenge={() => void openWeb('/games')}
            onOpenJob={(slug) => void openWeb(`/jobs/${slug}`)}
            onOpenPost={(id) => void openWeb(`/feed?post=${id}`)}
            topics={discovery.topics}
          />
        ) : view === 'messages' ? (
          <MessagesView
            attachments={attachments}
            attachmentUrl={attachmentUrl}
            composer={composer}
            conversations={filteredConversations}
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
            onThreadQueryChange={setThreadQuery}
            onViewProfile={(slug) => void openWeb(`/vouch/${slug}`)}
            selectedConversation={selectedConversation}
            selectedConversationId={selectedConversationId}
            sending={sending}
            threadQuery={threadQuery}
            totalConversations={conversations.length}
          />
        ) : view === 'activity' ? (
          <ActivityView
            items={activity}
            loading={activityLoading}
            onOpen={(item) => void openActivity(item)}
            onOpenAll={() => void openWeb('/notifications')}
          />
        ) : view === 'jobs' ? (
          <JobsView
            jobs={directoryJobs}
            loading={jobsLoading}
            query={jobsQuery}
            onBrowse={() => void openWeb('/jobs')}
            onOpenJob={(slug) => void openWeb(`/jobs/${slug}`)}
            onQueryChange={setJobsQuery}
          />
        ) : view === 'organizations' ? (
          <OrganizationsView
            loading={jobsLoading}
            organizations={directoryOrganizations}
            query={jobsQuery}
            onBrowse={() => void openWeb('/companies')}
            onOpenOrganization={(slug) => void openWeb(`/company/${slug}`)}
            onQueryChange={setJobsQuery}
          />
        ) : view === 'network' ? (
          <NetworkView
            loading={networkLoading}
            network={network}
            onAccept={(id) => void respondInvitation(id, 'accept')}
            onConnect={(userId) => void connectWith(userId)}
            onDecline={(id) => void respondInvitation(id, 'decline')}
            onOpenAll={() => void openWeb('/mynetwork')}
            onOpenProfile={(slug) => void openWeb(`/vouch/${slug}`)}
          />
        ) : view === 'discover' ? (
          <OpportunitiesView
            loading={opportunitiesLoading}
            opportunities={opportunities}
            query={opportunityQuery}
            remoteOnly={remoteOnly}
            onBrowse={() => void openWeb('/opportunities')}
            onOpenOpportunity={(slug) => void openWeb(`/opportunities/${slug}`)}
            onQueryChange={setOpportunityQuery}
            onRemoteOnlyChange={setRemoteOnly}
          />
        ) : (
          <SavedView
            loading={savedLoading}
            posts={savedPosts}
            onOpenAll={() => void openWeb('/saved')}
            onOpenPost={(id) => void openWeb(`/feed?post=${id}`)}
            onUnsave={(id) => void unsavePost(id)}
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
                <strong>{discovery.dailyChallenge.title}</strong>
                <small>
                  {discovery.dailyChallenge.difficultyLabel} · {discovery.dailyChallenge.moveBudget}{' '}
                  moves
                </small>
              </span>
            </li>
            <li>
              <b>02</b>
              <span>
                <strong>{discovery.jobs.length} transparent roles</strong>
                <small>Salary-forward discovery</small>
              </span>
            </li>
            <li>
              <b>03</b>
              <span>
                <strong>{unreadCount} unread messages</strong>
                <small>Synced to this device</small>
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
            {commandItems.navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setCommandOpen(false);
                  setCommandQuery('');
                }}
                type="button"
              >
                <span>{item.icon}</span> Open {item.label}
                <kbd>{item.shortcut}</kbd>
              </button>
            ))}
            {commandItems.extras.length ? <p className="command-label">Actions</p> : null}
            {commandItems.extras.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCommandOpen(false);
                  setCommandQuery('');
                  void openWeb(item.path);
                }}
                type="button"
              >
                <span>{item.icon}</span> {item.label}
                <kbd>↗</kbd>
              </button>
            ))}
            {commandQuery.trim().length >= 2 ? (
              <>
                <p className="command-label">
                  {searchLoading
                    ? 'Searching VouchNet…'
                    : `Results for “${searchResults.query || commandQuery.trim()}”`}
                </p>
                {searchResults.people.map((person) => (
                  <button
                    key={person.userId}
                    onClick={() => {
                      setCommandOpen(false);
                      setCommandQuery('');
                      void openWeb(`/vouch/${person.slug}`);
                    }}
                    type="button"
                  >
                    <span>◎</span> {person.fullName}
                    <kbd>{person.isPlus ? 'Plus' : 'Person'}</kbd>
                  </button>
                ))}
                {searchResults.jobs.map((job) => (
                  <button
                    key={job.slug}
                    onClick={() => {
                      setCommandOpen(false);
                      setCommandQuery('');
                      void openWeb(`/jobs/${job.slug}`);
                    }}
                    type="button"
                  >
                    <span>▣</span> {job.title}
                    <kbd>{job.organizationName}</kbd>
                  </button>
                ))}
                {searchResults.organizations.map((organization) => (
                  <button
                    key={organization.slug}
                    onClick={() => {
                      setCommandOpen(false);
                      setCommandQuery('');
                      void openWeb(`/company/${organization.slug}`);
                    }}
                    type="button"
                  >
                    <span>◇</span> {organization.name}
                    <kbd>Company</kbd>
                  </button>
                ))}
                {!searchLoading &&
                searchResults.people.length +
                  searchResults.jobs.length +
                  searchResults.organizations.length ===
                  0 ? (
                  <p className="command-footer">
                    No people, jobs, or companies matched that query.
                  </p>
                ) : null}
              </>
            ) : null}
            <p className="command-footer">Esc to close · letter keys jump between spaces</p>
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
        <div className="brand-orb brand-pulse">V</div>
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
        <div className="brand-orb brand-pulse">V</div>
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
  jobs,
  topics,
  challenge,
  onCompose,
  onOpenPost,
  onOpenJob,
  onOpenChallenge,
}: {
  feed: FeedPost[];
  jobs: DiscoveryJob[];
  topics: string[];
  challenge: FeedDiscovery['dailyChallenge'];
  onCompose: () => void;
  onOpenPost: (id: string) => void;
  onOpenJob: (slug: string) => void;
  onOpenChallenge: () => void;
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
      <aside className="home-aside">
        <section className="discovery-panel">
          <p className="eyebrow">Daily challenge</p>
          <h3>{challenge.title}</h3>
          <p>
            {challenge.difficultyLabel} · solve in {challenge.moveBudget} moves or fewer.
          </p>
          <button onClick={onOpenChallenge} type="button">
            Play Signal Circuit →
          </button>
        </section>
        {topics.length ? (
          <section className="discovery-panel soft">
            <p className="eyebrow">Topics in view</p>
            <div className="topic-row">
              {topics.map((topic) => (
                <span key={topic}>{topic}</span>
              ))}
            </div>
          </section>
        ) : null}
        {jobs.length ? (
          <section className="discovery-panel soft">
            <p className="eyebrow">Transparent roles</p>
            <ul className="mini-job-list">
              {jobs.slice(0, 3).map((job) => (
                <li key={job.slug}>
                  <button onClick={() => onOpenJob(job.slug)} type="button">
                    <strong>{job.title}</strong>
                    <small>
                      {job.organizationName} · {formatSalary(job)}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function MessagesView(props: {
  conversations: Conversation[];
  totalConversations: number;
  selectedConversationId: string | null;
  selectedConversation: Conversation | null;
  messages: Message[];
  currentUserName: string;
  composer: string;
  attachments: Attachment[];
  attachmentUrl: string;
  threadQuery: string;
  loading: boolean;
  sending: boolean;
  onSelectConversation: (id: string) => void;
  onComposerChange: (value: string) => void;
  onAttachmentUrlChange: (value: string) => void;
  onThreadQueryChange: (value: string) => void;
  onAddAttachment: () => void;
  onRemoveAttachment: (url: string) => void;
  onSend: () => void;
  onViewProfile: (slug: string) => void;
}) {
  const {
    conversations,
    totalConversations,
    selectedConversationId,
    selectedConversation,
    messages,
    currentUserName,
    composer,
    attachments,
    attachmentUrl,
    threadQuery,
    loading,
    sending,
    onSelectConversation,
    onComposerChange,
    onAttachmentUrlChange,
    onThreadQueryChange,
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
          ⌕{' '}
          <input
            aria-label="Search conversations"
            onChange={(event) => onThreadQueryChange(event.target.value)}
            placeholder="Search conversations"
            value={threadQuery}
          />
        </div>
        {conversations.length === 0 ? (
          <div className="conversation-empty">
            <span>✦</span>
            <h3>{totalConversations === 0 ? 'No conversations yet' : 'No matches'}</h3>
            <p>
              {totalConversations === 0
                ? 'Once a contact opens a thread, your desktop inbox will stay in sync.'
                : 'Try another name or phrase from the conversation.'}
            </p>
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

function ActivityView({
  items,
  loading,
  onOpen,
  onOpenAll,
}: {
  items: ActivityItem[];
  loading: boolean;
  onOpen: (item: ActivityItem) => void;
  onOpenAll: () => void;
}) {
  return (
    <section className="activity-surface">
      <div className="surface-toolbar">
        <div>
          <p className="eyebrow">Useful updates</p>
          <h2>Activity that deserves attention</h2>
        </div>
        <button className="button-quiet" onClick={onOpenAll} type="button">
          Open full inbox ↗
        </button>
      </div>
      {loading ? (
        <div className="message-loading padded">
          <i />
          <i />
          <i />
        </div>
      ) : items.length === 0 ? (
        <div className="conversation-empty centered">
          <span>◌</span>
          <h3>You’re up to date.</h3>
          <p>Daily puzzles, security signals, and direct professional updates appear here.</p>
        </div>
      ) : (
        <div className="activity-list">
          {items.map((item) => (
            <button
              className={item.readAt ? 'activity-item' : 'activity-item unread'}
              key={item.id}
              onClick={() => onOpen(item)}
              type="button"
            >
              <span>⌁</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <small>{formatDate(item.createdAt)}</small>
              </div>
              <i>Open →</i>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function JobsView({
  jobs,
  loading,
  query,
  onBrowse,
  onOpenJob,
  onQueryChange,
}: {
  jobs: DirectoryJob[];
  loading: boolean;
  query: string;
  onBrowse: () => void;
  onOpenJob: (slug: string) => void;
  onQueryChange: (value: string) => void;
}) {
  return (
    <section className="directory-surface">
      <div className="surface-toolbar">
        <div>
          <p className="eyebrow">Transparent opportunities</p>
          <h2>Know the work before you apply.</h2>
        </div>
        <button className="button-primary" onClick={onBrowse} type="button">
          Browse all jobs ↗
        </button>
      </div>
      <div className="thread-search directory-search">
        ⌕{' '}
        <input
          aria-label="Search jobs"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search roles, companies, or skills"
          value={query}
        />
      </div>
      {loading ? (
        <div className="message-loading padded">
          <i />
          <i />
          <i />
        </div>
      ) : jobs.length === 0 ? (
        <div className="conversation-empty centered">
          <span>▣</span>
          <h3>No roles matched</h3>
          <p>Try another skill, company, or open the full salary-forward jobs directory.</p>
        </div>
      ) : (
        <div className="directory-grid">
          {jobs.map((job) => (
            <article className="directory-card" key={job.slug}>
              <p className="eyebrow">{job.organizationName}</p>
              <h3>{job.title}</h3>
              <p>
                {job.location} · {formatSalary(job)}
              </p>
              {job.skillTags.length ? (
                <div className="topic-row">
                  {job.skillTags.slice(0, 4).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              ) : null}
              <button onClick={() => onOpenJob(job.slug)} type="button">
                View role →
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OrganizationsView({
  organizations,
  loading,
  query,
  onBrowse,
  onOpenOrganization,
  onQueryChange,
}: {
  organizations: DirectoryOrganization[];
  loading: boolean;
  query: string;
  onBrowse: () => void;
  onOpenOrganization: (slug: string) => void;
  onQueryChange: (value: string) => void;
}) {
  return (
    <section className="directory-surface">
      <div className="surface-toolbar">
        <div>
          <p className="eyebrow">Source-reviewed organizations</p>
          <h2>Meet the teams behind the work.</h2>
        </div>
        <button className="button-primary" onClick={onBrowse} type="button">
          Browse companies ↗
        </button>
      </div>
      <div className="thread-search directory-search">
        ⌕{' '}
        <input
          aria-label="Search organizations"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search companies or technologies"
          value={query}
        />
      </div>
      {loading ? (
        <div className="message-loading padded">
          <i />
          <i />
          <i />
        </div>
      ) : organizations.length === 0 ? (
        <div className="conversation-empty centered">
          <span>◇</span>
          <h3>Directory quiet for now</h3>
          <p>Open the company directory for source-reviewed organization records.</p>
        </div>
      ) : (
        <div className="directory-grid">
          {organizations.map((organization) => (
            <article className="directory-card" key={organization.slug}>
              <p className="eyebrow">
                {organization.verificationStatus === 'DOMAIN_VERIFIED'
                  ? 'Domain verified'
                  : organization.openRoleCount !== undefined
                    ? `${organization.openRoleCount} open role${organization.openRoleCount === 1 ? '' : 's'}`
                    : 'Source reviewed'}
              </p>
              <h3>{organization.name}</h3>
              <p>{organization.tagline ?? 'Source-reviewed organization on VouchNet.'}</p>
              {organization.technologies.length ? (
                <div className="topic-row">
                  {organization.technologies.slice(0, 4).map((tech) => (
                    <span key={tech}>{tech}</span>
                  ))}
                </div>
              ) : null}
              <button onClick={() => onOpenOrganization(organization.slug)} type="button">
                View organization →
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NetworkView({
  network,
  loading,
  onAccept,
  onDecline,
  onConnect,
  onOpenProfile,
  onOpenAll,
}: {
  network: NetworkPayload;
  loading: boolean;
  onAccept: (connectionId: string) => void;
  onDecline: (connectionId: string) => void;
  onConnect: (userId: string) => void;
  onOpenProfile: (slug: string) => void;
  onOpenAll: () => void;
}) {
  return (
    <section className="directory-surface">
      <div className="surface-toolbar">
        <div>
          <p className="eyebrow">Professional graph</p>
          <h2>Build a network with context.</h2>
        </div>
        <button className="button-primary" onClick={onOpenAll} type="button">
          Open full network ↗
        </button>
      </div>
      <div className="network-stats">
        <article>
          <strong>{network.overview.contactCount}</strong>
          <span>Contacts</span>
        </article>
        <article>
          <strong>{network.overview.followingCount}</strong>
          <span>Following</span>
        </article>
        <article>
          <strong>{network.overview.pendingReceivedCount}</strong>
          <span>Invitations</span>
        </article>
      </div>
      {loading ? (
        <div className="message-loading padded">
          <i />
          <i />
          <i />
        </div>
      ) : (
        <>
          {network.overview.pendingReceived.length ? (
            <div className="network-section">
              <p className="eyebrow">Pending invitations</p>
              <div className="directory-grid">
                {network.overview.pendingReceived.map((invitation) => (
                  <article className="directory-card" key={invitation.connectionId}>
                    <p className="eyebrow">Wants to connect</p>
                    <h3>
                      {invitation.firstName} {invitation.lastName}
                    </h3>
                    <p>{invitation.headline ?? 'VouchNet member'}</p>
                    <div className="network-actions">
                      <button onClick={() => onAccept(invitation.connectionId)} type="button">
                        Accept
                      </button>
                      <button
                        className="button-quiet"
                        onClick={() => onDecline(invitation.connectionId)}
                        type="button"
                      >
                        Decline
                      </button>
                      <button
                        className="button-quiet"
                        onClick={() => onOpenProfile(invitation.slug)}
                        type="button"
                      >
                        Profile ↗
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          <div className="network-section">
            <p className="eyebrow">People you may know</p>
            {network.recommendations.length === 0 ? (
              <div className="conversation-empty centered">
                <span>◎</span>
                <h3>No recommendations right now</h3>
                <p>As your contacts grow, mutual-context suggestions appear here.</p>
              </div>
            ) : (
              <div className="directory-grid">
                {network.recommendations.map((person) => (
                  <article className="directory-card" key={person.userId}>
                    <p className="eyebrow">
                      {person.mutualContacts} mutual contact
                      {person.mutualContacts === 1 ? '' : 's'}
                    </p>
                    <h3>
                      {person.firstName} {person.lastName}
                    </h3>
                    <p>{person.headline ?? 'VouchNet member'}</p>
                    <div className="network-actions">
                      <button onClick={() => onConnect(person.userId)} type="button">
                        Connect
                      </button>
                      <button
                        className="button-quiet"
                        onClick={() => onOpenProfile(person.slug)}
                        type="button"
                      >
                        Profile ↗
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function OpportunitiesView({
  opportunities,
  loading,
  query,
  remoteOnly,
  onBrowse,
  onOpenOpportunity,
  onQueryChange,
  onRemoteOnlyChange,
}: {
  opportunities: OpportunityCard[];
  loading: boolean;
  query: string;
  remoteOnly: boolean;
  onBrowse: () => void;
  onOpenOpportunity: (slug: string) => void;
  onQueryChange: (value: string) => void;
  onRemoteOnlyChange: (value: boolean) => void;
}) {
  return (
    <section className="directory-surface">
      <div className="surface-toolbar">
        <div>
          <p className="eyebrow">Build in public</p>
          <h2>Open work worth proposing on.</h2>
        </div>
        <button className="button-primary" onClick={onBrowse} type="button">
          Browse opportunities ↗
        </button>
      </div>
      <div className="opportunity-filters">
        <div className="thread-search directory-search">
          ⌕{' '}
          <input
            aria-label="Search opportunities"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search briefs, skills, or posters"
            value={query}
          />
        </div>
        <label className="remote-toggle">
          <input
            checked={remoteOnly}
            onChange={(event) => onRemoteOnlyChange(event.target.checked)}
            type="checkbox"
          />
          Remote only
        </label>
      </div>
      {loading ? (
        <div className="message-loading padded">
          <i />
          <i />
          <i />
        </div>
      ) : opportunities.length === 0 ? (
        <div className="conversation-empty centered">
          <span>◈</span>
          <h3>No open opportunities matched</h3>
          <p>Try clearing filters or post a brief from the web workspace.</p>
        </div>
      ) : (
        <div className="directory-grid">
          {opportunities.map((opportunity) => (
            <article className="directory-card" key={opportunity.id}>
              <p className="eyebrow">
                {opportunity.type.replaceAll('_', ' ')} · {opportunity.proposalCount} proposal
                {opportunity.proposalCount === 1 ? '' : 's'}
              </p>
              <h3>{opportunity.title}</h3>
              <p>{opportunity.summary}</p>
              <small>
                {opportunity.poster.name}
                {opportunity.remote
                  ? ' · Remote'
                  : opportunity.location
                    ? ` · ${opportunity.location}`
                    : ''}
              </small>
              {opportunity.tags.length ? (
                <div className="topic-row">
                  {opportunity.tags.slice(0, 4).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              ) : null}
              <button onClick={() => onOpenOpportunity(opportunity.slug)} type="button">
                View opportunity →
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SavedView({
  posts,
  loading,
  onOpenPost,
  onUnsave,
  onOpenAll,
}: {
  posts: SavedPost[];
  loading: boolean;
  onOpenPost: (id: string) => void;
  onUnsave: (id: string) => void;
  onOpenAll: () => void;
}) {
  return (
    <section className="directory-surface">
      <div className="surface-toolbar">
        <div>
          <p className="eyebrow">Your reading list</p>
          <h2>Posts worth returning to.</h2>
        </div>
        <button className="button-primary" onClick={onOpenAll} type="button">
          Open saved on web ↗
        </button>
      </div>
      {loading ? (
        <div className="message-loading padded">
          <i />
          <i />
          <i />
        </div>
      ) : posts.length === 0 ? (
        <div className="conversation-empty centered">
          <span>☆</span>
          <h3>Nothing saved yet</h3>
          <p>Save posts from the feed on web or desktop when you want to revisit them later.</p>
        </div>
      ) : (
        <div className="desktop-feed">
          {posts.map((post) => (
            <article className="post-card" key={post.id}>
              <header>
                <span className="post-avatar">{initials(post.authorName)}</span>
                <div>
                  <strong>{post.authorName}</strong>
                  <small>
                    {post.authorHeadline ?? 'VouchNet member'} · saved {formatDate(post.savedAt)}
                  </small>
                </div>
                <button onClick={() => onUnsave(post.id)} type="button">
                  Unsave
                </button>
              </header>
              <p>{post.bodyMarkdown}</p>
              <footer>
                <span>
                  ⌁ {post.peerSignal} verified signal · {post.commentCount} comments
                </span>
                <button onClick={() => onOpenPost(post.id)} type="button">
                  Open discussion →
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
