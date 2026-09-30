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
  const [copied, setCopied] = useState(false);
  const markdown = `[![${label}](${imageUrl})](${targetUrl})`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
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
        {copied ? 'Copied Markdown' : 'Copy Markdown'}
      </button>
    </section>
  );
}
