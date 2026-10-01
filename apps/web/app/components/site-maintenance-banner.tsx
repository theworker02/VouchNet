'use client';

import { useState } from 'react';

const maintenanceEndsAt = new Date('2026-10-06T00:00:00-04:00').getTime();

const supportLinks = {
  repository: 'https://github.com/theworker02/VouchNet',
  issue: 'https://github.com/theworker02/VouchNet/issues/new?template=bug_report.yml',
  feature: 'https://github.com/theworker02/VouchNet/issues/new?template=feature_request.yml',
} as const;

/** A client-dismissible operational notice. It intentionally has no effect on access controls. */
export function SiteMaintenanceBanner() {
  const [visible, setVisible] = useState(() => Date.now() < maintenanceEndsAt);

  function dismiss() {
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="site-maintenance-banner" aria-label="Site maintenance notice" role="status">
      <div className="site-maintenance-banner__content">
        <span className="site-maintenance-banner__flag" aria-hidden="true">
          !
        </span>
        <p>
          <strong>Maintenance in progress.</strong> VouchNet is undergoing maintenance through
          October 5, 2026.
        </p>
        <div className="site-maintenance-banner__actions" aria-label="Project support links">
          <a href={supportLinks.issue} rel="noreferrer" target="_blank">
            Submit an issue
          </a>
          <a href={supportLinks.feature} rel="noreferrer" target="_blank">
            Request a feature
          </a>
          <a href={supportLinks.repository} rel="noreferrer" target="_blank">
            Repository
          </a>
        </div>
      </div>
      <button
        aria-label="Dismiss maintenance notice"
        className="site-maintenance-banner__dismiss"
        onClick={dismiss}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="m3 3 10 10M13 3 3 13" />
        </svg>
      </button>
    </aside>
  );
}
