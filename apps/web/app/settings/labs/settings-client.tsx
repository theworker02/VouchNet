'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  developerModeEvent,
  isDeveloperModeEnabled,
  setDeveloperMode,
} from '../../components/developer-mode';
import { LocalRuntimeBenchmark } from './local-runtime-benchmark';

const compactFeedKey = 'vouchnet:labs-compact-feed';
const runtimeLabelsKey = 'vouchnet:labs-runtime-labels';

function readFlag(key: string) {
  return typeof window !== 'undefined' && window.localStorage.getItem(key) === 'true';
}

function writeFlag(key: string, value: boolean) {
  window.localStorage.setItem(key, String(value));
  document.documentElement.dataset[key.replace('vouchnet:labs-', '').replaceAll('-', '')] =
    String(value);
}

export function DeveloperModeSettings() {
  const [enabled, setEnabled] = useState(false);
  const [compactFeed, setCompactFeed] = useState(false);
  const [runtimeLabels, setRuntimeLabels] = useState(false);

  useEffect(() => {
    function refresh() {
      setEnabled(isDeveloperModeEnabled());
      setCompactFeed(readFlag(compactFeedKey));
      setRuntimeLabels(readFlag(runtimeLabelsKey));
    }
    refresh();
    window.addEventListener(developerModeEvent, refresh);
    return () => window.removeEventListener(developerModeEvent, refresh);
  }, []);

  if (!enabled)
    return (
      <main className="labs-gate">
        <p className="eyebrow">VouchNet Labs</p>
        <h1>Labs is currently locked.</h1>
        <p>
          This optional space holds browser-only experimental presentation preferences. It never
          grants account, moderation, billing, or developer-platform privileges.
        </p>
        <Link className="secondary" href="/settings">
          Back to settings
        </Link>
      </main>
    );

  return (
    <main className="labs-settings">
      <header>
        <p className="eyebrow">VouchNet Labs · Browser-only preferences</p>
        <h1>Experiment without extra authority.</h1>
        <p>
          These controls are local to this browser and do not alter privacy, access control, or
          other members&apos; experience.
        </p>
      </header>
      <section>
        <label>
          <span>
            <strong>Compact feed rhythm</strong>
            <small>Reduce spacing around feed cards on this browser.</small>
          </span>
          <input
            checked={compactFeed}
            onChange={(event) => {
              setCompactFeed(event.target.checked);
              writeFlag(compactFeedKey, event.target.checked);
            }}
            type="checkbox"
          />
        </label>
        <label>
          <span>
            <strong>Experience runtime labels</strong>
            <small>Show the runtime boundary label on supported interactive posts.</small>
          </span>
          <input
            checked={runtimeLabels}
            onChange={(event) => {
              setRuntimeLabels(event.target.checked);
              writeFlag(runtimeLabelsKey, event.target.checked);
            }}
            type="checkbox"
          />
        </label>
      </section>
      <LocalRuntimeBenchmark />
      <button
        className="secondary"
        onClick={() => {
          setDeveloperMode(false);
          setEnabled(false);
        }}
        type="button"
      >
        Turn off Labs on this browser
      </button>
    </main>
  );
}
