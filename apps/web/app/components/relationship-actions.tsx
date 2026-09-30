'use client';

import { useState } from 'react';

export function RelationshipActions({ userId }: { userId: string }) {
  const [status, setStatus] = useState<'idle' | 'working' | 'connected' | 'following' | 'error'>(
    'idle',
  );
  async function requestConnection() {
    setStatus('working');
    const response = await fetch('/api/network/connections', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId }),
    });
    setStatus(response.ok ? 'connected' : 'error');
  }
  async function follow() {
    setStatus('working');
    const response = await fetch(`/api/network/follow/${userId}`, { method: 'POST' });
    setStatus(response.ok ? 'following' : 'error');
  }
  if (status === 'connected') return <p className="action-feedback">Connection request sent.</p>;
  if (status === 'following')
    return <p className="action-feedback">You are now following this person.</p>;
  return (
    <div className="relationship-actions">
      <button
        type="button"
        disabled={status === 'working'}
        onClick={() => void requestConnection()}
      >
        Connect
      </button>
      <button
        className="secondary-button"
        type="button"
        disabled={status === 'working'}
        onClick={() => void follow()}
      >
        Follow
      </button>
      {status === 'error' ? (
        <p className="form-error">
          That action could not be completed. Refresh to check its current state.
        </p>
      ) : null}
    </div>
  );
}

export function InvitationActions({ connectionId }: { connectionId: string }) {
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  async function respond(action: 'accept' | 'decline') {
    setStatus('working');
    const response = await fetch('/api/network/connections', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ connectionId, action }),
    });
    setStatus(response.ok ? 'done' : 'error');
  }
  if (status === 'done')
    return (
      <p className="action-feedback">Invitation updated. Refresh this page to see your network.</p>
    );
  return (
    <div className="relationship-actions">
      <button type="button" disabled={status === 'working'} onClick={() => void respond('accept')}>
        Accept
      </button>
      <button
        className="secondary-button"
        type="button"
        disabled={status === 'working'}
        onClick={() => void respond('decline')}
      >
        Decline
      </button>
      {status === 'error' ? <p className="form-error">Could not update this invitation.</p> : null}
    </div>
  );
}
