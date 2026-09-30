'use client';

import { useState } from 'react';

export function EmbedBadge({
  label,
  imageUrl,
  targetUrl,
}: {
  label: string;
  imageUrl: string;
  targetUrl: string;
}) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const markdown = `[![${label}](${imageUrl})](${targetUrl})`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1600);
    } catch {
      setCopyStatus('error');
    }
  }
  return (
    <section className="embed-badge">
      <div>
        <p className="eyebrow">Share your work</p>
        <h2>Embed a VouchNet badge</h2>
        <p>
          Use this Markdown in a README or personal site to give visitors a direct path to your
          public work.
        </p>
      </div>
      <code>{markdown}</code>
      <button type="button" onClick={() => void copy()}>
        {copyStatus === 'copied' ? 'Copied Markdown' : 'Copy Markdown'}
      </button>
      {copyStatus === 'error' ? (
        <p className="form-error" role="alert">
          Copying is unavailable in this browser. Select the Markdown above and copy it manually.
        </p>
      ) : null}
    </section>
  );
}
