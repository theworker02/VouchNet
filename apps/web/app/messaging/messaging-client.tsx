'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { ConversationMessage, ConversationSummary, MessageAttachment } from '../lib/messaging';

type Props = { currentUserId: string; initialConversations: ConversationSummary[] };

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(value),
  );
}

export function MessagingClient({ currentUserId, initialConversations }: Props) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [composer, setComposer] = useState('');
  const [attachments, setAttachments] = useState<Omit<MessageAttachment, 'id'>[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentKind, setAttachmentKind] = useState<MessageAttachment['kind']>('LINK');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(selectedId !== null);
  const [isSending, setIsSending] = useState(false);
  const selectedIdRef = useRef(selectedId);
  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  function selectConversation(id: string) {
    if (id === selectedId) return;
    // Clear before changing recipients so no previous thread can render under the new name.
    setMessages([]);
    setStatus(null);
    setIsLoadingMessages(true);
    selectedIdRef.current = id;
    setSelectedId(id);
  }

  useEffect(() => {
    if (selectedId === null) return;

    const controller = new AbortController();
    let isCurrentConversation = true;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 8_000);
    void fetch(`/api/messages/${selectedId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('CONVERSATION_UNAVAILABLE');
        return (await response.json()) as { messages: ConversationMessage[] };
      })
      .then((payload) => {
        if (!isCurrentConversation) return;
        window.clearTimeout(timeoutId);
        setMessages(payload.messages);
        setStatus(null);
        setIsLoadingMessages(false);
      })
      .catch(() => {
        if (!isCurrentConversation) return;
        window.clearTimeout(timeoutId);
        if (timedOut) {
          setStatus('This conversation took too long to load. Select it again to retry.');
          setIsLoadingMessages(false);
        } else if (!controller.signal.aborted) {
          setStatus('This conversation could not be loaded.');
          setIsLoadingMessages(false);
        }
      });
    return () => {
      isCurrentConversation = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [selectedId]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedId === null || isSending || (composer.trim() === '' && attachments.length === 0)) {
      return;
    }
    const conversationId = selectedId;
    const body = composer.trim();
    const pendingAttachments = attachments;
    setComposer('');
    setAttachments([]);
    setIsSending(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(`/api/messages/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, attachments: pendingAttachments }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('MESSAGE_SEND_FAILED');
      const payload = (await response.json()) as { message: ConversationMessage };
      if (selectedIdRef.current === conversationId) {
        setMessages((current) => [...current, payload.message]);
      }
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessage: {
                  body: payload.message.body,
                  createdAt: payload.message.createdAt,
                  senderId: currentUserId,
                },
              }
            : conversation,
        ),
      );
      setStatus(null);
    } catch {
      if (selectedIdRef.current === conversationId) {
        setComposer(body);
        setAttachments(pendingAttachments);
      }
      setStatus('Your message was not sent. Check your connection and try again.');
    } finally {
      window.clearTimeout(timeoutId);
      setIsSending(false);
    }
  }

  function addAttachment() {
    try {
      const parsed = new URL(attachmentUrl.trim());
      if (parsed.protocol !== 'https:' || attachments.length >= 4) throw new Error('INVALID_URL');
      setAttachments((current) => [
        ...current,
        { url: parsed.toString(), kind: attachmentKind, label: null, altText: null },
      ]);
      setAttachmentUrl('');
      setStatus(null);
    } catch {
      setStatus('Add an HTTPS image, portfolio, or document link.');
    }
  }

  return (
    <section className="messaging-surface" aria-label="Messages">
      <aside className="messaging-threads">
        <header>
          <p className="eyebrow">Messaging</p>
          <h1>Conversations</h1>
          <p>Direct messages are available to accepted contacts.</p>
        </header>
        {conversations.length === 0 ? (
          <div className="messaging-empty">
            <h2>No conversations yet</h2>
            <p>
              Connect with someone first, then open their profile to start a private conversation.
            </p>
          </div>
        ) : (
          <div className="message-thread-list" role="list">
            {conversations.map((conversation) => (
              <button
                className={
                  conversation.id === selectedId ? 'message-thread active-thread' : 'message-thread'
                }
                key={conversation.id}
                onClick={() => selectConversation(conversation.id)}
                type="button"
              >
                <span className="message-avatar" aria-hidden="true">
                  {conversation.counterpart.fullName
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)}
                </span>
                <span>
                  <strong>{conversation.counterpart.fullName}</strong>
                  <small>
                    {conversation.lastMessage?.body ??
                      conversation.counterpart.headline ??
                      'Start a conversation'}
                  </small>
                </span>
                {conversation.unreadCount > 0 ? (
                  <i>{conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}</i>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </aside>
      <article className="messaging-thread">
        {selected === null ? (
          <div className="messaging-thread-empty">
            <h2>Select a conversation</h2>
            <p>Your contact conversations stay private to their participants.</p>
          </div>
        ) : (
          <>
            <header className="messaging-thread-header">
              <div>
                <h2>{selected.counterpart.fullName}</h2>
                <p>{selected.counterpart.headline ?? 'VouchNet member'}</p>
              </div>
              <a href={`/vouch/${selected.counterpart.slug}`}>View profile</a>
            </header>
            <div aria-busy={isLoadingMessages} className="message-log">
              {isLoadingMessages ? (
                <div className="message-log-loading" role="status">
                  <span className="message-loading-bubble" />
                  <span className="message-loading-bubble message-loading-bubble--short" />
                  <span className="message-loading-bubble message-loading-bubble--own" />
                  <span className="sr-only">
                    Loading conversation with {selected.counterpart.fullName}
                  </span>
                </div>
              ) : messages.length === 0 ? (
                <p className="message-first-note">Start a useful, respectful conversation.</p>
              ) : (
                messages.map((message) => (
                  <div
                    className={
                      message.senderId === currentUserId
                        ? 'message-bubble own-message'
                        : 'message-bubble'
                    }
                    key={message.id}
                  >
                    <p>{message.body}</p>
                    {message.attachments.map((attachment) =>
                      attachment.kind === 'IMAGE' ? (
                        // This is an external, member-supplied HTTPS image—not an application asset.
                        // It cannot access VouchNet state and sends no referrer to the remote host.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={attachment.altText ?? 'Shared image'}
                          className="message-image-attachment"
                          key={attachment.id}
                          referrerPolicy="no-referrer"
                          src={attachment.url}
                        />
                      ) : (
                        <a
                          className="message-link-attachment"
                          href={attachment.url}
                          key={attachment.id}
                          referrerPolicy="no-referrer"
                          rel="noreferrer"
                          target="_blank"
                        >
                          {attachment.kind === 'PORTFOLIO'
                            ? 'Portfolio'
                            : attachment.kind.toLowerCase()}{' '}
                          ↗
                        </a>
                      ),
                    )}
                    <small>
                      {formatTime(message.createdAt)}
                      {message.editedAt === null ? '' : ' · edited'}
                      {message.senderId === currentUserId ? (
                        <span
                          aria-label={message.seenAt === null ? 'Delivered' : 'Seen'}
                          className={
                            message.seenAt === null ? 'message-checks' : 'message-checks seen'
                          }
                        >
                          ✓✓
                        </span>
                      ) : null}
                    </small>
                  </div>
                ))
              )}
            </div>
            <form
              aria-busy={isSending}
              className="message-composer"
              onSubmit={(event) => void send(event)}
            >
              <label className="sr-only" htmlFor="message-body">
                Message {selected.counterpart.fullName}
              </label>
              <textarea
                id="message-body"
                disabled={isLoadingMessages || isSending}
                maxLength={12000}
                onChange={(event) => setComposer(event.target.value)}
                placeholder={`Message ${selected.counterpart.fullName}…`}
                value={composer}
              />
              <div className="message-attachment-controls">
                <div className="message-attachment-input">
                  <select
                    aria-label="Attachment type"
                    disabled={isLoadingMessages || isSending}
                    onChange={(event) =>
                      setAttachmentKind(event.target.value as MessageAttachment['kind'])
                    }
                    value={attachmentKind}
                  >
                    <option value="LINK">Link</option>
                    <option value="IMAGE">Image</option>
                    <option value="PORTFOLIO">Portfolio</option>
                    <option value="DOCUMENT">Document</option>
                  </select>
                  <input
                    aria-label="HTTPS attachment URL"
                    disabled={isLoadingMessages || isSending}
                    onChange={(event) => setAttachmentUrl(event.target.value)}
                    placeholder="https://…"
                    type="url"
                    value={attachmentUrl}
                  />
                  <button
                    disabled={isLoadingMessages || isSending}
                    onClick={addAttachment}
                    type="button"
                  >
                    Add
                  </button>
                </div>
                {attachments.length === 0 ? null : (
                  <div className="message-attachment-list">
                    {attachments.map((attachment, index) => (
                      <button
                        key={`${attachment.url}-${index}`}
                        onClick={() =>
                          setAttachments((current) => current.filter((_, item) => item !== index))
                        }
                        type="button"
                      >
                        {attachment.kind.toLowerCase()} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                disabled={
                  isLoadingMessages ||
                  isSending ||
                  (composer.trim() === '' && attachments.length === 0)
                }
              >
                {isSending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </>
        )}
        {status === null ? null : (
          <p className="form-error" role="status">
            {status}
          </p>
        )}
      </article>
    </section>
  );
}
