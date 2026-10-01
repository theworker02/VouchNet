'use client';

import { useState } from 'react';
import type { ErrorEvent, ErrorStatus } from '../../lib/telemetry-server';

const statuses: readonly ErrorStatus[] = ['UNRESOLVED', 'TRIAGED', 'RESOLVED', 'IGNORED'];

export function ErrorTriageTable({ initialEvents }: { initialEvents: ErrorEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function update(id: string, status: ErrorStatus) {
    setPendingId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/errors/${id}`, {
        body: JSON.stringify({ status }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });
      if (!response.ok) throw new Error('ERROR_UPDATE_FAILED');
      setEvents((current) =>
        current.map((event) => (event.id === id ? { ...event, status } : event)),
      );
    } catch {
      setMessage('The error status could not be updated. Try again.');
    } finally {
      setPendingId(null);
    }
  }
  return (
    <section className="error-triage-table" aria-label="Error diagnostics">
      {message === null ? null : <p className="form-error">{message}</p>}
      {events.length === 0 ? (
        <p className="muted-copy">No diagnostic events have been recorded.</p>
      ) : (
        <div className="error-triage-list">
          {events.map((event) => (
            <article key={event.id}>
              <header>
                <div>
                  <span
                    className={`error-severity error-severity--${event.severity.toLowerCase()}`}
                  >
                    {event.severity}
                  </span>
                  <strong>{event.errorName}</strong>
                  <small>{event.route}</small>
                </div>
                <time dateTime={event.createdAt.toISOString()}>
                  {event.createdAt.toLocaleString()}
                </time>
              </header>
              <p>{event.errorMessage}</p>
              {event.stackTrace === null ? null : <pre>{event.stackTrace}</pre>}
              <details>
                <summary>Diagnostic context</summary>
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{event.status}</dd>
                  </div>
                  <div>
                    <dt>Session</dt>
                    <dd>{event.sessionId ?? 'None'}</dd>
                  </div>
                  <div>
                    <dt>User</dt>
                    <dd>{event.userId ?? 'Anonymous'}</dd>
                  </div>
                  <div>
                    <dt>User agent</dt>
                    <dd>{event.userAgent ?? 'Not supplied'}</dd>
                  </div>
                </dl>
              </details>
              <div className="error-triage-actions">
                {statuses.map((status) => (
                  <button
                    aria-pressed={event.status === status}
                    disabled={pendingId === event.id || event.status === status}
                    key={status}
                    onClick={() => void update(event.id, status)}
                    type="button"
                  >
                    {status.replaceAll('_', ' ').toLowerCase()}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
