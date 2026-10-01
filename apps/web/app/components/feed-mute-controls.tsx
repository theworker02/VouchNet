'use client';

import { useEffect, useState } from 'react';

export function FeedMuteControls() {
  const [isPlus, setIsPlus] = useState<boolean | null>(null);
  const [terms, setTerms] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    void fetch('/api/settings/feed-mute')
      .then(async (response) => {
        if (!response.ok) throw new Error('FEED_MUTE_UNAVAILABLE');
        const body = (await response.json()) as { isPlus: boolean; keywords: string[] };
        setIsPlus(body.isPlus);
        setTerms(body.keywords.join('\n'));
      })
      .catch(() => setIsPlus(false));
  }, []);

  async function save() {
    setStatus('saving');
    const keywords = terms
      .split(/[\n,]/)
      .map((term) => term.trim())
      .filter(Boolean);
    try {
      const response = await fetch('/api/settings/feed-mute', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keywords }),
      });
      setStatus(response.ok ? 'saved' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="feed-mute-controls">
      <p className="eyebrow">VouchNet+ feed controls</p>
      <h2>Mute low-value phrases before they reach your feed.</h2>
      <p>
        Add up to 15 words or exact phrases, one per line. Filters apply server-side to your feed;
        literal matching is used rather than arbitrary regex for safety.
      </p>
      {isPlus === null ? (
        <p className="muted-copy">Loading feed controls…</p>
      ) : isPlus ? (
        <>
          <label className="sr-only" htmlFor="feed-mute-terms">
            Muted words and phrases
          </label>
          <textarea
            id="feed-mute-terms"
            maxLength={975}
            onChange={(event) => setTerms(event.target.value)}
            placeholder={'engagement bait\njob spam\noff-topic opinion'}
            value={terms}
          />
          <button disabled={status === 'saving'} onClick={() => void save()} type="button">
            {status === 'saving' ? 'Saving…' : 'Save feed controls'}
          </button>
          {status === 'saved' ? <p className="action-feedback">Feed controls saved.</p> : null}
          {status === 'error' ? (
            <p className="form-error">Feed controls could not be saved.</p>
          ) : null}
        </>
      ) : (
        <p className="muted-copy">Available with an active VouchNet+ membership.</p>
      )}
    </section>
  );
}
