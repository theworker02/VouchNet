'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface ServiceRequestView {
  id: string;
  serviceTitle: string | null;
  requesterName: string;
  requesterSlug: string;
  message: string;
  status: 'OPEN' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  createdAt: string;
}

export function ServiceRequestsInbox({ requests }: { requests: ServiceRequestView[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function respond(id: string, status: 'ACCEPTED' | 'DECLINED') {
    setBusy(id);
    try {
      await fetch(`/api/service-requests/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (requests.length === 0) return null;
  return (
    <div className="service-requests">
      {requests.map((request) => (
        <article className="experience-entry" key={request.id}>
          <div>
            <strong>
              <Link href={`/in/${request.requesterSlug}`}>{request.requesterName}</Link>
              {request.serviceTitle === null ? '' : ` · ${request.serviceTitle}`}
            </strong>
            <p>{request.message}</p>
            <span>
              {new Date(request.createdAt).toLocaleDateString()} ·{' '}
              {request.status === 'OPEN' ? 'Awaiting response' : request.status.toLowerCase()}
            </span>
          </div>
          {request.status === 'OPEN' ? (
            <div className="experience-entry-actions">
              <button
                className="quiet-link"
                type="button"
                disabled={busy === request.id}
                onClick={() => void respond(request.id, 'ACCEPTED')}
              >
                Accept
              </button>
              <button
                className="quiet-link danger"
                type="button"
                disabled={busy === request.id}
                onClick={() => void respond(request.id, 'DECLINED')}
              >
                Decline
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
