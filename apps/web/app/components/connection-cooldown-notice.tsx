'use client';

import { useState } from 'react';

export function ConnectionCooldownNotice({ resetsAt }: { resetsAt: Date }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  const reset = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(resetsAt);
  async function dismiss() {
    // Dismissal is presentation-only. The server still blocks new requests until the reset time.
    await fetch('/api/network/connection-cooldown', { method: 'DELETE' }).catch(() => undefined);
    setVisible(false);
  }
  return (
    <section className="connection-cooldown-notice" role="status">
      <div>
        <strong>Slow down on connection requests</strong>
        <p>
          To protect members from unsolicited outreach, you cannot send more connection requests
          until {reset}.
        </p>
      </div>
      <button type="button" onClick={() => void dismiss()}>
        Dismiss
      </button>
    </section>
  );
}
