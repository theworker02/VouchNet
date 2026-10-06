'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * "Identity Verified" badge. Hover reveals the detail card on pointer devices; tapping toggles it
 * on touch screens. The card only ever says what was checked and when — never document details.
 */
export function IdentityVerifiedBadge({
  method,
  verifiedDateLabel,
}: {
  method: string;
  verifiedDateLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);
  return (
    <span className="identity-badge-wrap" ref={wrapRef}>
      <button
        type="button"
        className="identity-verified-badge"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">✓</span>
        Identity Verified
      </button>
      <span className={open ? 'identity-badge-card open' : 'identity-badge-card'} role="status">
        <strong>Identity verified</strong>
        <span>{method}</span>
        <span>Verified {verifiedDateLabel}</span>
      </span>
    </span>
  );
}
