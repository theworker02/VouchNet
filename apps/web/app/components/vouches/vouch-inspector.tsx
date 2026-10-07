'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { relationshipLabels, verificationLabels, visibilityLabels } from '../../lib/vouch-model';
import type { VouchDetail } from '../../lib/work-vouches';
import { useVouchBoard, type BoardVouch } from './vouch-board';
import { VouchMark } from './vouch-mark';
import { useFocusTrap } from './use-focus-trap';

export type InspectorTarget =
  { mode: 'detail'; id: string } | { mode: 'list'; title: string; vouchIds?: string[] };

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** Side panel (bottom sheet on small screens) for exploring and inspecting vouches. */
export function VouchInspector({
  target,
  onClose,
}: {
  target: InspectorTarget;
  onClose: () => void;
}) {
  const board = useVouchBoard();
  const reduceMotion = useReducedMotion() ?? false;
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [current, setCurrent] = useState<InspectorTarget>(target);
  const [lastTarget, setLastTarget] = useState<InspectorTarget>(target);
  if (lastTarget !== target) {
    // A new target from the board (another category or vouch) replaces the current view.
    setLastTarget(target);
    setCurrent(target);
  }
  useFocusTrap(panelRef, true, onClose);

  const list =
    current.mode === 'list'
      ? board.vouches.filter(
          (vouch) => current.vouchIds === undefined || current.vouchIds.includes(vouch.id),
        )
      : [];

  return (
    <div className="instrument vouch-inspector-layer" role="presentation">
      <motion.div
        className="vouch-console-backdrop vouch-inspector-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.2 }}
        onMouseDown={onClose}
        aria-hidden="true"
      />
      <motion.aside
        ref={panelRef}
        className="vouch-inspector"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reduceMotion ? false : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <header className="vouch-console-header">
          <span className="instrument-label">VOUCH INSPECTOR</span>
          <button
            type="button"
            className="instrument-icon-button"
            aria-label="Close vouch inspector"
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <AnimatePresence mode="wait" initial={false}>
          {current.mode === 'list' ? (
            <motion.div
              key="list"
              className="vouch-console-body"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.14 }}
            >
              <h2 id={titleId}>{current.title}</h2>
              <p className="instrument-muted">
                {list.length === 1 ? '1 vouch' : `${list.length} vouches`} for{' '}
                {board.recipient.name}
              </p>
              <ul className="vouch-inspector-list">
                {list.map((vouch) => (
                  <li key={vouch.id}>
                    <button
                      type="button"
                      data-autofocus={vouch === list[0] ? true : undefined}
                      disabled={vouch.pending === true}
                      onClick={() => setCurrent({ mode: 'detail', id: vouch.id })}
                    >
                      <span className="instrument-avatar instrument-avatar--sm" aria-hidden="true">
                        {vouch.author.firstName[0]}
                        {vouch.author.lastName[0]}
                      </span>
                      <span>
                        <strong>{vouch.author.name}</strong>
                        <small>
                          {relationshipLabels[vouch.relationship]} ·{' '}
                          {vouch.skills.slice(0, 3).join(', ')}
                        </small>
                      </span>
                      <span className="instrument-label">
                        {vouch.pending === true
                          ? 'SAVING'
                          : verificationLabels[vouch.verificationLevel].label.toUpperCase()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div
              key={current.id}
              className="vouch-console-body"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.14 }}
            >
              <VouchDetailView
                id={current.id}
                titleId={titleId}
                fallback={board.vouches.find((vouch) => vouch.id === current.id) ?? null}
                onBack={target.mode === 'list' ? () => setCurrent(target) : null}
                onClose={onClose}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
}

function VouchDetailView({
  id,
  titleId,
  fallback,
  onBack,
  onClose,
}: {
  id: string;
  titleId: string;
  fallback: BoardVouch | null;
  onBack: (() => void) | null;
  onClose: () => void;
}) {
  const board = useVouchBoard();
  const [detail, setDetail] = useState<VouchDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // The parent keys this view by vouch id, so each mount starts in the loading state.
    let cancelled = false;
    fetch(`/api/vouches/${id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = (await response.json()) as { vouch: VouchDetail };
        if (!cancelled) {
          setDetail(body.vouch);
          setState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function act(
    action: 'REVOKE' | 'HIDE' | 'UNHIDE' | 'MODERATE_REMOVE' | 'MODERATE_RESTORE',
  ) {
    if (
      action === 'REVOKE' &&
      !window.confirm('Revoke this vouch? It will be removed from the profile.')
    )
      return;
    setMessage(null);
    const response = await fetch(`/api/vouches/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    if (response === null || !response.ok) {
      setMessage('That change could not be saved.');
      return;
    }
    if (action === 'REVOKE') {
      board.settleOptimistic(id, null);
      onClose();
      window.location.reload();
      return;
    }
    if (detail !== null) {
      const hidden = action === 'HIDE' ? true : action === 'UNHIDE' ? false : detail.hidden;
      const next = {
        ...detail,
        hidden,
        moderationState:
          action === 'MODERATE_REMOVE'
            ? 'REMOVED'
            : action === 'MODERATE_RESTORE'
              ? 'ACTIVE'
              : detail.moderationState,
        viewerActions: detail.viewerActions.map((item) =>
          item === 'HIDE' && hidden ? 'UNHIDE' : item === 'UNHIDE' && !hidden ? 'HIDE' : item,
        ),
      } as VouchDetail;
      setDetail(next);
      board.replaceVouch(next);
    }
    setMessage(action === 'HIDE' ? 'Hidden from your profile.' : 'Updated.');
  }

  const vouch = detail ?? fallback;
  if (vouch === null)
    return (
      <p id={titleId} className="instrument-muted" role="status">
        {state === 'error' ? 'This vouch is not available.' : 'Loading vouch…'}
      </p>
    );
  const actions = detail?.viewerActions ?? [];

  return (
    <article className="vouch-inspector-detail">
      {onBack === null ? null : (
        <button type="button" className="instrument-quiet vouch-inspector-back" onClick={onBack}>
          ← All vouches
        </button>
      )}
      <div className="vouch-inspector-route">
        <span className="instrument-avatar" aria-hidden="true">
          {vouch.author.firstName[0]}
          {vouch.author.lastName[0]}
        </span>
        <VouchMark size={22} />
        <span className="instrument-avatar" aria-hidden="true">
          {vouch.recipient.firstName[0]}
          {vouch.recipient.lastName[0]}
        </span>
      </div>
      <h2 id={titleId}>
        {vouch.author.slug === '' ? (
          vouch.author.name
        ) : (
          <Link href={`/vouch/${vouch.author.slug}`}>{vouch.author.name}</Link>
        )}
        <span className="instrument-muted"> vouched for </span>
        <Link href={`/vouch/${vouch.recipient.slug}`}>{vouch.recipient.name}</Link>
      </h2>
      <ul className="vouch-artifact-skills" aria-label="Skills">
        {vouch.skills.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
      <blockquote>{vouch.statement}</blockquote>
      <dl className="vouch-inspector-facts">
        <div>
          <dt>Relationship</dt>
          <dd>{relationshipLabels[vouch.relationship]}</dd>
        </div>
        <div>
          <dt>Worked together</dt>
          <dd>{vouch.workedTogetherYear}</dd>
        </div>
        <div>
          <dt>Context</dt>
          <dd>
            {vouch.context === null ? (
              'None attached'
            ) : vouch.context.href === null ? (
              vouch.context.name
            ) : (
              <Link href={vouch.context.href}>{vouch.context.name}</Link>
            )}
          </dd>
        </div>
        <div>
          <dt>Organization</dt>
          <dd>{vouch.context?.type === 'ORGANIZATION' ? vouch.context.name : 'None'}</dd>
        </div>
        <div>
          <dt>Verification</dt>
          <dd>
            {verificationLabels[vouch.verificationLevel].label}
            <small>{verificationLabels[vouch.verificationLevel].detail}</small>
          </dd>
        </div>
        <div>
          <dt>Vouched</dt>
          <dd>{dateFormat.format(new Date(vouch.createdAt))}</dd>
        </div>
        <div>
          <dt>Visibility</dt>
          <dd>{visibilityLabels[vouch.visibility]}</dd>
        </div>
      </dl>
      {detail === null ? null : (
        <section className="vouch-inspector-provenance" aria-label="Why this vouch is credible">
          <h3 className="instrument-label">WHY THIS VOUCH IS CREDIBLE</h3>
          <ul>
            {detail.provenance.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </section>
      )}
      {detail === null || detail.revisions.length <= 1 ? null : (
        <section className="vouch-inspector-history" aria-label="Edit history">
          <h3 className="instrument-label">EDIT HISTORY</h3>
          <ol>
            {detail.revisions.map((revision) => (
              <li key={`${revision.change}-${String(revision.createdAt)}`}>
                {revision.change === 'CREATED' ? 'Written' : 'Edited'} by {revision.editorName} ·{' '}
                {dateFormat.format(new Date(revision.createdAt))}
              </li>
            ))}
          </ol>
        </section>
      )}
      {detail?.hidden === true ? (
        <p className="instrument-muted">Hidden from the recipient’s profile.</p>
      ) : null}
      {message === null ? null : (
        <p className="instrument-muted" role="status">
          {message}
        </p>
      )}
      <footer className="vouch-inspector-actions">
        {actions.includes('EDIT') ? (
          <button
            type="button"
            className="instrument-quiet"
            onClick={() => {
              onClose();
              board.openConsole('vouch-inspector-edit');
            }}
          >
            Edit
          </button>
        ) : null}
        {actions.includes('REVOKE') ? (
          <button type="button" className="instrument-quiet" onClick={() => void act('REVOKE')}>
            Revoke
          </button>
        ) : null}
        {actions.includes('HIDE') ? (
          <button type="button" className="instrument-quiet" onClick={() => void act('HIDE')}>
            Hide from my profile
          </button>
        ) : null}
        {actions.includes('UNHIDE') ? (
          <button type="button" className="instrument-quiet" onClick={() => void act('UNHIDE')}>
            Show on my profile
          </button>
        ) : null}
        {actions.includes('MODERATE') ? (
          <button
            type="button"
            className="instrument-quiet"
            onClick={() =>
              void act(
                detail?.moderationState === 'REMOVED' ? 'MODERATE_RESTORE' : 'MODERATE_REMOVE',
              )
            }
          >
            {detail?.moderationState === 'REMOVED' ? 'Restore (moderator)' : 'Remove (moderator)'}
          </button>
        ) : null}
        {actions.includes('REPORT') ? (
          <Link
            className="instrument-quiet"
            href={`/moderation/report?path=${encodeURIComponent(`/vouches/${vouch.id}`)}`}
          >
            Report
          </Link>
        ) : null}
        <Link className="instrument-quiet" href={`/vouches/${vouch.id}`}>
          Open page
        </Link>
      </footer>
    </article>
  );
}
