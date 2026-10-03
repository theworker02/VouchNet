'use client';

import { useState } from 'react';
import type { ModerationReport, ReportStatus } from '../lib/moderation';

const statuses: { value: ReportStatus; label: string }[] = [
  { value: 'UNDER_REVIEW', label: 'Mark under review' },
  { value: 'RESOLVED', label: 'Resolve' },
  { value: 'DISMISSED', label: 'Dismiss' },
];

export function ModerationQueue({
  initialReports,
  allowedStatuses,
}: {
  initialReports: ModerationReport[];
  allowedStatuses: ReportStatus[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [message, setMessage] = useState<string | null>(null);

  async function update(reportId: string, status: ReportStatus) {
    setMessage(null);
    try {
      const response = await fetch(`/api/moderation/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        setMessage('That report could not be updated. Your role may only allow triage.');
        return;
      }
      setReports((current) =>
        current.map((report) => (report.id === reportId ? { ...report, status } : report)),
      );
    } catch {
      setMessage('The network is unavailable. The report was not changed.');
    }
  }

  if (reports.length === 0)
    return <p className="moderation-empty">No member reports are waiting.</p>;
  return (
    <div className="moderation-queue">
      {message !== null ? <p role="status">{message}</p> : null}
      {reports.map((report) => (
        <article key={report.id}>
          <header>
            <span className={`moderation-status moderation-status-${report.status.toLowerCase()}`}>
              {report.status.replace('_', ' ')}
            </span>
            <time dateTime={report.createdAt.toISOString()}>
              {report.createdAt.toLocaleDateString()}
            </time>
          </header>
          <strong>{report.category.replace('_', ' ')}</strong>
          <a href={report.subjectPath}>{report.subjectPath}</a>
          <p>{report.details}</p>
          <small>Submitted by {report.reporterName}</small>
          <div>
            {statuses
              .filter((option) => allowedStatuses.includes(option.value))
              .map((option) => (
                <button
                  key={option.value}
                  onClick={() => update(report.id, option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
          </div>
        </article>
      ))}
    </div>
  );
}
