'use client';
import { useState, type FormEvent } from 'react';
export function StudioConversation({
  requestId,
  initialMessages,
}: {
  requestId: string;
  initialMessages: { id: string; body: string; authorRole: string; createdAt: string }[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`/api/studio/requests/${requestId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    if (!response.ok) {
      setError('Message could not be sent.');
      return;
    }
    setMessages([
      ...messages,
      {
        id: crypto.randomUUID(),
        body,
        authorRole: 'CUSTOMER',
        createdAt: new Date().toISOString(),
      },
    ]);
    setBody('');
  }
  return (
    <section className="studio-conversation">
      <h2>Project communication</h2>
      <div>
        {messages.length === 0 ? (
          <p>
            No messages yet. Share any essential context here after the brief is paid and under
            review.
          </p>
        ) : (
          messages.map((message) => (
            <article key={message.id}>
              <b>{message.authorRole === 'ADMIN' ? 'VouchNet Studio' : 'You'}</b>
              <p>{message.body}</p>
              <time>{new Date(message.createdAt).toLocaleString()}</time>
            </article>
          ))
        )}
      </div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="studio-message">
          Project message
        </label>
        <textarea
          id="studio-message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4000}
          required
          placeholder="Add a project message"
        />
        <button className="secondary-button" type="submit">
          Send message
        </button>
        {error === null ? null : <p className="form-error">{error}</p>}
      </form>
    </section>
  );
}
