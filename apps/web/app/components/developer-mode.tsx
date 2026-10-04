'use client';

import { useEffect } from 'react';

export const developerModeStorageKey = 'vouchnet:labs-enabled';
export const developerModeEvent = 'vouchnet:labs-change';

export function isDeveloperModeEnabled() {
  return (
    typeof window !== 'undefined' && window.localStorage.getItem(developerModeStorageKey) === 'true'
  );
}

export function setDeveloperMode(enabled: boolean) {
  window.localStorage.setItem(developerModeStorageKey, String(enabled));
  document.documentElement.dataset.vouchnetLabs = String(enabled);
  window.dispatchEvent(new Event(developerModeEvent));
}

/**
 * A small opt-in Easter egg for experimental presentation settings. It deliberately
 * never changes authorization or exposes privileged server controls.
 */
export function DeveloperModeListener() {
  useEffect(() => {
    document.documentElement.dataset.vouchnetLabs = String(isDeveloperModeEnabled());
    let buffer = '';
    function listen(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      )
        return;
      buffer = `${buffer}${event.key.toLowerCase()}`.slice(-5);
      if (buffer !== 'vouch') return;
      setDeveloperMode(!isDeveloperModeEnabled());
      buffer = '';
    }
    window.addEventListener('keydown', listen);
    return () => window.removeEventListener('keydown', listen);
  }, []);
  return null;
}
