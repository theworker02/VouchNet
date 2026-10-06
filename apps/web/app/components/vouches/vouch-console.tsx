'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { suggestedSkills } from '../../lib/skill-categories';
import {
  relationshipLabels,
  verificationLabels,
  visibilityLabels,
  vouchLimits,
  vouchRelationships,
  vouchVisibilities,
  type VerificationLevel,
  type VouchRelationship,
  type VouchVisibility,
} from '../../lib/vouch-model';
import type { ComposerContext } from '../../lib/work-vouches';
import { useVouchBoard, type BoardVouch } from './vouch-board';
import { VouchMark } from './vouch-mark';
import { useFocusTrap } from './use-focus-trap';

const denialCopy: Record<string, string> = {
  CANNOT_VOUCH_FOR_SELF: 'You cannot vouch for yourself.',
  ACCOUNT_NOT_ELIGIBLE: 'Your account is not able to vouch right now.',
  EMAIL_VERIFICATION_REQUIRED:
    'Verify your email address before vouching. It keeps vouches attributable.',
  PROFILE_UNAVAILABLE: 'This profile is not available for vouching.',
  BLOCKED_RELATIONSHIP: 'Vouching is unavailable for this profile.',
  CONTEXT_NOT_SHARED: 'You can only attach a project or organization you both belong to.',
  RELATIONSHIP_REQUIRED:
    'Vouches come from real working relationships. Connect with this member or share a VouchNet project first.',
  ALREADY_VOUCHED: 'You already vouch for this member. Edit your existing vouch instead.',
  VOUCH_RATE_LIMITED:
    'You have reached the vouching limit for now. Vouches are deliberately scarce.',
  RATE_LIMITED: 'Too many requests in a short time. Wait a moment and try again.',
  INVALID_INPUT: 'Check the skills and statement, then try again.',
};

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type Step = 'edit' | 'preview' | 'confirming';

const levelRank: Record<VerificationLevel, number> = {
  STANDARD: 0,
  CONTEXT_VERIFIED: 1,
  ORGANIZATION_VERIFIED: 2,
  CONTRIBUTION_VERIFIED: 3,
};

export function VouchConsole({ origin, onClose }: { origin: string; onClose: () => void }) {
  const board = useVouchBoard();
  const composer = board.composer;
  const existing = composer?.existing ?? null;
  const reduceMotion = useReducedMotion() ?? false;
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const listId = useId();
  const currentYear = new Date().getFullYear();

  const [step, setStep] = useState<Step>('edit');
  const [relationship, setRelationship] = useState<VouchRelationship>(
    existing?.relationship ?? 'COLLABORATOR',
  );
  const [contextKey, setContextKey] = useState<string>(() => {
    if (existing !== null)
      return existing.context === null ? 'NONE' : `${existing.context.type}:${existing.context.id}`;
    // A new vouch starts from the shared context that VouchNet can verify most strongly.
    const strongest = [...(composer?.contexts ?? [])].sort(
      (a, b) => levelRank[b.expectedLevel] - levelRank[a.expectedLevel],
    )[0];
    return strongest === undefined ? 'NONE' : `${strongest.type}:${strongest.id}`;
  });
  const [year, setYear] = useState<number>(existing?.workedTogetherYear ?? currentYear);
  const [skills, setSkills] = useState<string[]>(existing?.skills ?? []);
  const [query, setQuery] = useState('');
  const [activeOption, setActiveOption] = useState(0);
  const [statement, setStatement] = useState(existing?.statement ?? '');
  const [visibility, setVisibility] = useState<VouchVisibility>(existing?.visibility ?? 'PUBLIC');
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (step !== 'confirming') onClose();
  }, [onClose, step]);
  useFocusTrap(panelRef, true, close);

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && step === 'edit') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [step]);

  if (composer === null) return null;
  const recipient = composer.recipient;
  const context: ComposerContext | null =
    composer.contexts.find((item) => `${item.type}:${item.id}` === contextKey) ?? null;
  const expectedLevel: VerificationLevel = context?.expectedLevel ?? 'STANDARD';
  const options = filterSkills(query, skills);
  const statementLength = statement.trim().length;
  const ready =
    skills.length > 0 &&
    statementLength >= vouchLimits.statementMin &&
    statementLength <= vouchLimits.statementMax;

  function addSkill(value: string) {
    const skill = value.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (skill.length < 2 || skills.length >= vouchLimits.maxSkills) return;
    if (skills.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
    setSkills([...skills, skill]);
    setQuery('');
    setActiveOption(0);
  }

  function onSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveOption((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveOption((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[activeOption];
      if (option !== undefined) addSkill(option);
    } else if (event.key === 'Backspace' && query === '' && skills.length > 0) {
      setSkills(skills.slice(0, -1));
    }
  }

  function onChipKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + vouchRelationships.length) % vouchRelationships.length;
    const value = vouchRelationships[next];
    if (value === undefined) return;
    setRelationship(value);
    panelRef.current?.querySelector<HTMLButtonElement>(`[data-relationship="${value}"]`)?.focus();
  }

  async function confirm() {
    if (composer === null || board.viewer === null) return;
    setError(null);
    setStep('confirming');
    const payload = {
      relationship,
      contextType: context?.type ?? 'NONE',
      contextId: context?.id ?? null,
      workedTogetherYear: year,
      skills,
      statement: statement.trim(),
      visibility,
    };
    const temporaryId = `pending-${Date.now()}`;
    const optimistic: BoardVouch = {
      id: existing?.id ?? temporaryId,
      author: {
        userId: board.viewer.userId,
        slug: '',
        name: board.viewer.name,
        firstName: board.viewer.name.split(' ')[0] ?? board.viewer.name,
        lastName: board.viewer.name.split(' ').slice(1).join(' '),
        headline: board.viewer.headline,
      },
      recipient,
      relationship,
      context:
        context === null
          ? null
          : { type: context.type, id: context.id, name: context.name, href: context.href },
      workedTogetherYear: year,
      skills,
      statement: statement.trim(),
      visibility,
      verificationLevel: expectedLevel,
      evidence: [],
      createdAt: existing?.createdAt ?? new Date(),
      editedAt: existing === null ? null : new Date(),
      hidden: false,
      moderationState: 'ACTIVE',
      pending: true,
    };
    const previous = existing;
    if (previous === null) board.addOptimistic(optimistic);
    else board.replaceVouch(optimistic);
    const animation = new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : 1100));
    try {
      const response = await fetch(
        previous === null ? '/api/vouches' : `/api/vouches/${previous.id}`,
        {
          method: previous === null ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            previous === null ? { recipientId: recipient.userId, ...payload } : { edit: payload },
          ),
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        vouch?: { id: string; verificationLevel: VerificationLevel };
        verificationLevel?: VerificationLevel;
      };
      if (!response.ok) throw new Error(body.error ?? 'VOUCH_FAILED');
      await animation;
      if (previous === null)
        board.settleOptimistic(temporaryId, {
          id: body.vouch?.id ?? temporaryId,
          verificationLevel: body.vouch?.verificationLevel ?? expectedLevel,
        });
      else
        board.replaceVouch({
          ...optimistic,
          pending: false,
          verificationLevel: body.verificationLevel ?? expectedLevel,
        });
      onClose();
    } catch (caught) {
      await animation;
      if (previous === null) board.settleOptimistic(temporaryId, null);
      else board.replaceVouch(previous);
      const code = caught instanceof Error ? caught.message : 'VOUCH_FAILED';
      setError(denialCopy[code] ?? 'The vouch could not be saved. Nothing was published.');
      setStep('preview');
    }
  }

  const author = board.viewer;
  const blocked = !composer.eligible && existing === null;

  return (
    <div className="instrument vouch-console-layer" role="presentation">
      <motion.div
        className="vouch-console-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.24 }}
        onMouseDown={close}
        aria-hidden="true"
      />
      <motion.div
        ref={panelRef}
        layoutId={origin}
        className="vouch-console"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        transition={
          reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 }
        }
      >
        <header className="vouch-console-header">
          <span className="instrument-label">VOUCHNET</span>
          <button
            type="button"
            className="instrument-icon-button"
            aria-label="Close vouch console"
            onClick={close}
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
          {step === 'edit' ? (
            <motion.div
              key="edit"
              className="vouch-console-body"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
            >
              <div className="vouch-console-recipient">
                <span className="instrument-avatar" aria-hidden="true">
                  {initials(recipient.name)}
                </span>
                <div>
                  <p className="instrument-label">
                    {existing === null ? 'VOUCH FOR' : 'EDIT YOUR VOUCH FOR'}
                  </p>
                  <h2 id={titleId}>{recipient.name}</h2>
                  {recipient.headline === null ? null : (
                    <p className="instrument-muted">{recipient.headline}</p>
                  )}
                </div>
              </div>
              {blocked ? (
                <div className="vouch-console-blocked" role="status">
                  <p>{denialCopy[composer.denial ?? ''] ?? 'Vouching is unavailable right now.'}</p>
                </div>
              ) : (
                <>
                  <fieldset className="vouch-field">
                    <legend className="instrument-label">RELATIONSHIP</legend>
                    <div className="instrument-chips" role="radiogroup" aria-label="Relationship">
                      {vouchRelationships.map((value, index) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={relationship === value}
                          tabIndex={relationship === value ? 0 : -1}
                          data-relationship={value}
                          data-autofocus={relationship === value ? true : undefined}
                          className="instrument-chip"
                          onClick={() => setRelationship(value)}
                          onKeyDown={(event) => onChipKey(event, index)}
                        >
                          {relationshipLabels[value]}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="vouch-field-row">
                    <label className="vouch-field">
                      <span className="instrument-label">CONTEXT</span>
                      <select
                        className="instrument-input"
                        value={contextKey}
                        onChange={(event) => setContextKey(event.target.value)}
                      >
                        <option value="NONE">No shared project or organization</option>
                        {composer.contexts.map((item) => (
                          <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>
                            {item.type === 'PROJECT' ? 'Project' : 'Organization'} · {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="vouch-field vouch-field--year">
                      <span className="instrument-label">YEAR</span>
                      <select
                        className="instrument-input"
                        value={year}
                        onChange={(event) => setYear(Number(event.target.value))}
                      >
                        {Array.from({ length: 30 }, (_, offset) => currentYear - offset).map(
                          (value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  <div className="vouch-field">
                    <label
                      className="instrument-label vouch-skill-label"
                      htmlFor={`${listId}-search`}
                    >
                      <span>WHAT CAN YOU VOUCH FOR?</span>
                      <kbd className="instrument-kbd" aria-hidden="true">
                        ⌘K / Ctrl K
                      </kbd>
                    </label>
                    <div className="vouch-skill-box">
                      <ul className="vouch-tokens" aria-label="Selected skills">
                        <AnimatePresence initial={false}>
                          {skills.map((skill) => (
                            <motion.li
                              key={skill}
                              layout={!reduceMotion}
                              initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                              transition={{ duration: reduceMotion ? 0 : 0.16 }}
                              className="instrument-token"
                            >
                              {skill}
                              <button
                                type="button"
                                aria-label={`Remove ${skill}`}
                                onClick={() => setSkills(skills.filter((item) => item !== skill))}
                              >
                                ×
                              </button>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                      <input
                        id={`${listId}-search`}
                        ref={searchRef}
                        className="instrument-input vouch-skill-search"
                        role="combobox"
                        aria-expanded={query !== '' && options.length > 0}
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-activedescendant={
                          query !== '' && options[activeOption] !== undefined
                            ? `${listId}-${activeOption}`
                            : undefined
                        }
                        placeholder={
                          skills.length >= vouchLimits.maxSkills
                            ? `Up to ${vouchLimits.maxSkills} skills`
                            : 'Search skills, e.g. Rust or Technical Writing'
                        }
                        disabled={skills.length >= vouchLimits.maxSkills}
                        value={query}
                        maxLength={40}
                        onChange={(event) => {
                          setQuery(event.target.value);
                          setActiveOption(0);
                        }}
                        onKeyDown={onSearchKey}
                      />
                    </div>
                    {query === '' ? (
                      <div className="vouch-suggestions" aria-label="Suggested skills">
                        {options.slice(0, 6).map((option) => (
                          <button
                            key={option}
                            type="button"
                            className="instrument-chip instrument-chip--quiet"
                            onClick={() => addSkill(option)}
                          >
                            + {option}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <ul
                        id={listId}
                        role="listbox"
                        className="vouch-skill-options"
                        aria-label="Matching skills"
                      >
                        {options.map((option, index) => (
                          <li
                            key={option}
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={index === activeOption}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              addSkill(option);
                            }}
                          >
                            {option}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <label className="vouch-field">
                    <span className="instrument-label">YOUR VOUCH</span>
                    <textarea
                      className="instrument-input vouch-statement"
                      value={statement}
                      maxLength={vouchLimits.statementMax}
                      placeholder={`What did ${recipient.firstName} do, and what was it like to work with them?`}
                      onChange={(event) => setStatement(event.target.value)}
                      aria-describedby={`${listId}-count`}
                    />
                    <span id={`${listId}-count`} className="instrument-muted vouch-count-line">
                      {statementLength < vouchLimits.statementMin
                        ? `${vouchLimits.statementMin - statementLength} more characters`
                        : `${statementLength}/${vouchLimits.statementMax}`}
                    </span>
                  </label>
                  <fieldset className="vouch-field">
                    <legend className="instrument-label">VISIBILITY</legend>
                    <div className="instrument-segmented" role="radiogroup" aria-label="Visibility">
                      {vouchVisibilities.map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={visibility === value}
                          onClick={() => setVisibility(value)}
                        >
                          {value === 'PRIVATE'
                            ? `Only ${recipient.firstName}`
                            : visibilityLabels[value]}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <p className="vouch-identity-line">
                    <span
                      className={
                        composer.authorEmailVerified ? 'instrument-dot is-on' : 'instrument-dot'
                      }
                      aria-hidden="true"
                    />
                    {composer.authorEmailVerified
                      ? 'Your identity is verified by email'
                      : 'Email not verified'}
                    {' · '}
                    {composer.connected ? 'Connected' : 'Not connected'}
                    {' · '}
                    {verificationLabels[expectedLevel].label}
                  </p>
                  <footer className="vouch-console-footer">
                    <button
                      type="button"
                      className="instrument-primary"
                      disabled={!ready}
                      onClick={() => setStep('preview')}
                    >
                      Preview Vouch →
                    </button>
                  </footer>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              className="vouch-console-body"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
            >
              <h2 id={titleId} className="sr-only">
                Preview your vouch for {recipient.name}
              </h2>
              <article className="vouch-artifact" aria-label="Vouch preview">
                <header>
                  <span className="instrument-label">
                    {composer.authorEmailVerified ? 'VERIFIED VOUCH' : 'VOUCH'}
                  </span>
                  <span className="vouch-artifact-route">
                    {author?.name ?? 'You'} <span aria-hidden="true">→</span>
                    <span className="sr-only">vouches for</span> {recipient.name}
                  </span>
                </header>
                <div className="vouch-artifact-mark">
                  <VouchMark size={64} />
                  {step === 'confirming' && !reduceMotion ? <Propagation /> : null}
                </div>
                <ul className="vouch-artifact-skills" aria-label="Skills">
                  {skills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
                <p className="instrument-label vouch-artifact-year">WORKED TOGETHER · {year}</p>
                <blockquote>{statement.trim()}</blockquote>
                <dl>
                  <div>
                    <dt>Relationship</dt>
                    <dd>{relationshipLabels[relationship]}</dd>
                  </div>
                  <div>
                    <dt>Identity</dt>
                    <dd>{composer.authorEmailVerified ? 'Email verified' : 'Unverified'}</dd>
                  </div>
                  <div>
                    <dt>Project</dt>
                    <dd>{context?.name ?? 'None attached'}</dd>
                  </div>
                  <div>
                    <dt>Vouched</dt>
                    <dd>
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }).format(new Date())}
                    </dd>
                  </div>
                  <div>
                    <dt>Verification</dt>
                    <dd>{verificationLabels[expectedLevel].label}</dd>
                  </div>
                </dl>
              </article>
              {error === null ? null : (
                <p className="vouch-console-error" role="alert">
                  {error}
                </p>
              )}
              <footer className="vouch-console-footer">
                <button
                  type="button"
                  className="instrument-quiet"
                  disabled={step === 'confirming'}
                  onClick={() => {
                    setError(null);
                    setStep('edit');
                  }}
                >
                  ← Edit
                </button>
                <button
                  type="button"
                  className="instrument-primary"
                  disabled={step === 'confirming'}
                  data-autofocus
                  onClick={() => void confirm()}
                >
                  {step === 'confirming'
                    ? 'Vouching…'
                    : existing === null
                      ? 'Confirm & Vouch'
                      : 'Confirm changes'}
                </button>
              </footer>
              <p className="sr-only" role="status" aria-live="polite">
                {step === 'confirming' ? 'Publishing your vouch.' : ''}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/** Restrained confirmation: rings and short lines propagate outward from the V mark. */
function Propagation() {
  const rays = useMemo(
    () => Array.from({ length: 12 }, (_, index) => (index * Math.PI * 2) / 12),
    [],
  );
  return (
    <svg className="vouch-propagation" viewBox="-100 -100 200 200" aria-hidden="true">
      {[0, 0.18, 0.36].map((delay) => (
        <motion.circle
          key={delay}
          r={34}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.8}
          initial={{ scale: 0.9, opacity: 0.55 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 0.9, delay, ease: [0.2, 0.7, 0.2, 1] }}
        />
      ))}
      {rays.map((angle) => (
        <motion.line
          key={angle}
          x1={Math.cos(angle) * 38}
          y1={Math.sin(angle) * 38}
          x2={Math.cos(angle) * 46}
          y2={Math.sin(angle) * 46}
          stroke="currentColor"
          strokeWidth={0.8}
          strokeLinecap="round"
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{
            opacity: [0, 0.8, 0],
            pathLength: 1,
            x: Math.cos(angle) * 30,
            y: Math.sin(angle) * 30,
          }}
          transition={{ duration: 0.8, delay: 0.12, ease: 'easeOut' }}
        />
      ))}
    </svg>
  );
}

function filterSkills(query: string, selected: readonly string[]): string[] {
  const taken = new Set(selected.map((skill) => skill.toLowerCase()));
  const normalized = query.trim().toLowerCase();
  const pool = suggestedSkills.filter((skill) => !taken.has(skill.toLowerCase()));
  if (normalized === '') return pool;
  const matches = pool.filter((skill) => skill.toLowerCase().includes(normalized));
  const exact = matches.some((skill) => skill.toLowerCase() === normalized);
  return exact || taken.has(normalized)
    ? matches.slice(0, 8)
    : [...matches.slice(0, 7), query.trim()];
}
