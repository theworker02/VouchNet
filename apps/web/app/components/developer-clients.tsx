'use client';

import { useEffect, useState } from 'react';

type Client = {
  id: string;
  client_id: string;
  name: string;
  redirect_uris: string[];
  created_at: string;
  revoked_at: string | null;
};

export function DeveloperClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [created, setCreated] = useState<{ clientId: string; clientSecret: string } | null>(null);
  useEffect(() => {
    void fetch('/api/developer/clients')
      .then(async (response) =>
        response.ok ? (response.json() as Promise<{ clients: Client[] }>) : Promise.reject(),
      )
      .then((body) => setClients(body.clients))
      .catch(() => setStatus('error'));
  }, []);
  async function create(form: HTMLFormElement) {
    setStatus('saving');
    setCreated(null);
    const data = new FormData(form);
    const response = await fetch('/api/developer/clients', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'),
        redirectUris: String(data.get('redirectUri') ?? '')
          .split(/\r?\n/)
          .map((uri) => uri.trim())
          .filter(Boolean),
        scopes: ['profile:read', ...(data.get('profileEmail') === 'on' ? ['profile:email'] : [])],
      }),
    });
    if (!response.ok) {
      setStatus('error');
      return;
    }
    const body = (await response.json()) as { client: { clientId: string; clientSecret: string } };
    setCreated(body.client);
    form.reset();
    const reloaded = await fetch('/api/developer/clients');
    if (reloaded.ok) setClients(((await reloaded.json()) as { clients: Client[] }).clients);
    setStatus('idle');
  }
  async function revoke(id: string) {
    const response = await fetch(`/api/developer/clients/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setStatus('error');
      return;
    }
    setClients((items) =>
      items.map((client) =>
        client.id === id ? { ...client, revoked_at: new Date().toISOString() } : client,
      ),
    );
  }
  return (
    <div className="developer-clients">
      <form
        className="developer-client-form"
        onSubmit={(event) => {
          event.preventDefault();
          void create(event.currentTarget);
        }}
      >
        <label>
          Hiring site or product name
          <input name="name" maxLength={120} minLength={2} required />
        </label>
        <label>
          Exact callback URLs{' '}
          <small>One HTTPS URL per line; localhost is allowed only for development.</small>
          <textarea name="redirectUri" rows={3} required />
        </label>
        <label className="setting-toggle">
          <input name="profileEmail" type="checkbox" /> Request the member’s verified email as well
        </label>
        <button className="primary" disabled={status === 'saving'} type="submit">
          {status === 'saving' ? 'Creating…' : 'Create integration client'}
        </button>
      </form>
      {created !== null ? (
        <section className="developer-secret" role="status">
          <strong>Copy this secret now. It will not be shown again.</strong>
          <code>Client ID: {created.clientId}</code>
          <code>Client secret: {created.clientSecret}</code>
        </section>
      ) : null}
      {status === 'error' ? (
        <p className="form-error">
          The client could not be saved. Check its exact callback URLs and try again.
        </p>
      ) : null}
      <section className="developer-client-list">
        <h2>Your integration clients</h2>
        {clients.length === 0 ? <p className="muted-copy">No integration clients yet.</p> : null}
        {clients.map((client) => (
          <article key={client.id}>
            <div>
              <strong>{client.name}</strong>
              <code>{client.client_id}</code>
              <small>{client.redirect_uris.join(', ')}</small>
            </div>
            {client.revoked_at === null ? (
              <button className="secondary" onClick={() => void revoke(client.id)} type="button">
                Revoke
              </button>
            ) : (
              <span className="muted-copy">Revoked</span>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
