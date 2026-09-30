'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Recommendation {
  user_id: string;
  slug: string;
  first_name: string;
  last_name: string;
  headline: string | null;
  mutual_contacts: number;
  reasons: string[];
}

export function DiscoverClient() {
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/network/discover')
      .then(async (response) => {
        if (!response.ok) throw new Error('Discovery is temporarily unavailable.');
        return response.json() as Promise<{ recommendations: Recommendation[] }>;
      })
      .then((data) => setItems(data.recommendations))
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : 'Discovery is temporarily unavailable.',
        ),
      );
  }, []);
  async function dismiss(candidateId: string) {
    const response = await fetch('/api/network/discover', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ candidateId, feedback: 'DISMISSED' }),
    });
    if (response.ok) {
      setItems((current) => current?.filter((item) => item.user_id !== candidateId) ?? null);
    } else {
      setError('The suggestion could not be removed. Please try again.');
    }
  }
  return (
    <>
      <p className="eyebrow">Discover</p>
      <h1>People you may know</h1>
      <p>
        Suggestions use public professional context and mutual Contacts—not private profile views.
      </p>
      {error !== null ? (
        <section className="empty">
          <h2>Discovery unavailable</h2>
          <p>{error}</p>
        </section>
      ) : items === null ? (
        <section className="empty" aria-live="polite">
          <p>Finding relevant professionals…</p>
        </section>
      ) : items.length === 0 ? (
        <section className="empty">
          <h2>No suggestions right now</h2>
          <p>
            As your network grows, VouchNet can surface relevant, explainable introductions here.
          </p>
        </section>
      ) : (
        <section className="empty-grid">
          {items.map((item) => (
            <article key={item.user_id}>
              <h2>
                {item.first_name} {item.last_name}
              </h2>
              {item.headline === null ? null : <p>{item.headline}</p>}
              <p>
                {item.mutual_contacts} mutual Contact{item.mutual_contacts === 1 ? '' : 's'}
              </p>
              <p>
                <Link href={`/vouch/${item.slug}`}>View profile</Link>
              </p>
              <button type="button" onClick={() => void dismiss(item.user_id)}>
                Remove suggestion
              </button>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
