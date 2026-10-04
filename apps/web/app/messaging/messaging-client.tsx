'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  useEffect(() => {
    if (selectedId === null) {
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/messages/${selectedId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('CONVERSATION_UNAVAILABLE');
        return (await response.json()) as { messages: ConversationMessage[] };
      })
      .then((payload) => {
        setMessages(payload.messages);
        setStatus(null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('This conversation could not be loaded.');
      });
    return () => controller.abort();
  }, [selectedId]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedId === null || (composer.trim() === '' && attachments.length === 0)) return;
    const body = composer.trim();
    const pendingAttachments = attachments;
    setComposer('');
    setAttachments([]);
    try {
      const response = await fetch(`/api/messages/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, attachments: pendingAttachments }),
      });
      if (!response.ok) throw new Error('MESSAGE_SEND_FAILED');
      const payload = (await response.json()) as { message: ConversationMessage };
      setMessages((current) => [...current, payload.message]);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedId
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
      setComposer(body);
      setAttachments(pendingAttachments);
      setStatus('Your message was not sent. Check your connection and try again.');
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
                onClick={() => setSelectedId(conversation.id)}
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
      <article className="messaging-thread" aria-live="polite">
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
            <div className="message-log">
              {messages.length === 0 ? (
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
            <form className="message-composer" onSubmit={(event) => void send(event)}>
              <label className="sr-only" htmlFor="message-body">
                Message {selected.counterpart.fullName}
              </label>
              <textarea
                id="message-body"
                maxLength={12000}
                onChange={(event) => setComposer(event.target.value)}
                placeholder={`Message ${selected.counterpart.fullName}…`}
                value={composer}
              />
              <div className="message-attachment-controls">
                <div className="message-attachment-input">
                  <select
                    aria-label="Attachment type"
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
                    onChange={(event) => setAttachmentUrl(event.target.value)}
                    placeholder="https://…"
                    type="url"
                    value={attachmentUrl}
                  />
                  <button onClick={addAttachment} type="button">
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
              <button disabled={composer.trim() === '' && attachments.length === 0}>Send</button>
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
