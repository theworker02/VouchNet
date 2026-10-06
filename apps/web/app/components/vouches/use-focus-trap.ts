'use client';

import { useEffect, type RefObject } from 'react';

const focusable =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Keeps keyboard focus inside a dialog, closes on Escape, and restores focus on close. */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = ref.current;
    const first =
      node?.querySelector<HTMLElement>('[data-autofocus]') ??
      node?.querySelector<HTMLElement>(focusable);
    first?.focus({ preventScroll: true });
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }
      if (event.key !== 'Tab' || node === null) return;
      const items = [...node.querySelectorAll<HTMLElement>(focusable)].filter(
        (item) => item.offsetParent !== null,
      );
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem?.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus({ preventScroll: true });
    };
  }, [active, onEscape, ref]);
}
