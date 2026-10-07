'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Member = {
  userId: string;
  profileSlug: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'RECRUITER' | 'MEMBER';
  employmentVerifiedAt: Date | null;
};

export function OrganizationMembersPanel({ slug, members }: { slug: string; members: Member[] }) {
  const router = useRouter();
  const [profileSlug, setProfileSlug] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'EDITOR' | 'MEMBER'>('EDITOR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mutate(body: object) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/organizations/${slug}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const responseBody: unknown = await response.json().catch(() => null);
        const code =
          typeof responseBody === 'object' && responseBody !== null && 'error' in responseBody
            ? String(responseBody.error)
            : 'UNKNOWN';
        setError(
          code === 'ROLE_CHANGE_INVALID'
            ? 'That ownership or revocation change is not allowed. Transfer ownership before revoking an owner.'
            : 'This membership change could not be saved. Confirm the profile slug and your owner access.',
        );
        return;
      }
      setProfileSlug('');
      router.refresh();
    } catch {
      setError('This membership change could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="organization-members-panel" aria-labelledby="organization-members-heading">
      <div className="company-editor-heading">
        <div>
          <p className="eyebrow">Owner controls</p>
          <h2 id="organization-members-heading">People and access</h2>
        </div>
      </div>
      <p className="company-editor-note">
        Owners can manage roles. Editors can update public content but cannot administer people;
        Members have no page-management access. Ownership transfer is explicit and retained in the
        governance audit trail.
      </p>
      <form
        className="organization-member-add"
        onSubmit={(event) => {
          event.preventDefault();
          void mutate({ action: 'ASSIGN', profileSlug, role });
        }}
      >
        <label>
          VouchNet profile slug
          <input
            required
            value={profileSlug}
            onChange={(event) => setProfileSlug(event.target.value.trim().toLowerCase())}
            placeholder="jordan-smith"
          />
        </label>
        <label>
          Role
          <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
            <option value="ADMIN">Admin</option>
            <option value="EDITOR">Editor</option>
            <option value="MEMBER">Member</option>
          </select>
        </label>
        <button className="secondary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Add or update person'}
        </button>
      </form>
      {error === null ? null : <p className="form-error">{error}</p>}
      <ul className="organization-member-list">
        {members.map((member) => (
          <li key={member.userId}>
            <div>
              <strong>{member.name}</strong>
              <span>{member.role.toLowerCase()}</span>
            </div>
            {member.role === 'OWNER' ? (
              <span className="company-verified-badge">Owner</span>
            ) : (
              <div className="organization-member-actions">
                <button
                  className="quiet-link"
                  disabled={busy}
                  type="button"
                  onClick={() =>
                    void mutate({ action: 'TRANSFER_OWNERSHIP', profileSlug: member.profileSlug })
                  }
                >
                  Transfer ownership
                </button>
                <button
                  className="quiet-link danger"
                  disabled={busy}
                  type="button"
                  onClick={() => void mutate({ action: 'REVOKE', userId: member.userId })}
                >
                  Revoke
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
