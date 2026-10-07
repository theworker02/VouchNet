'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { summarizeSkillCategories, type SkillCategorySummary } from '../../lib/skill-categories';
import type { Constellation } from '../../lib/vouch-graph';
import { AccoladeEmblem } from './accolade-emblem';
import { useVouchBoard } from './vouch-board';
import { VouchMark } from './vouch-mark';
import { VouchTrigger } from './vouch-trigger';

/**
 * Profile trust module. Shows provenance and counts only: who vouches, for what, and the real
 * vouch edges around this member. It never renders a trust score.
 */
export function TrustModule({
  constellation,
  signInHref,
}: {
  constellation: Constellation;
  signInHref: string | null;
}) {
  const board = useVouchBoard();
  const reduceMotion = useReducedMotion() ?? false;
  const live = useMemo(
    () => board.vouches.filter((vouch) => !vouch.hidden && vouch.moderationState === 'ACTIVE'),
    [board.vouches],
  );
  const people = new Set(live.map((vouch) => vouch.author.userId)).size;
  const categories = useMemo(
    () =>
      summarizeSkillCategories(
        live.map((vouch) => ({
          id: vouch.id,
          authorId: vouch.author.userId,
          skills: vouch.skills,
        })),
      ),
    [live],
  );
  const authorNames = useMemo(
    () => new Map(live.map((vouch) => [vouch.author.userId, vouch.author.name])),
    [live],
  );
  const firstName = board.recipient.firstName;

  return (
    <section className="instrument trust-module" aria-labelledby="trust-module-title">
      <header className="trust-module-header">
        <div>
          <p className="instrument-label" id="trust-module-title">
            VOUCHES <span className="trust-module-total">{live.length}</span>
          </p>
          <p className="trust-module-summary">
            {people === 0
              ? `No one has vouched for ${firstName} yet`
              : `${people} ${people === 1 ? 'person vouches' : 'people vouch'} for ${board.recipient.name}`}
          </p>
        </div>
        <VouchMark size={34} className="vouch-mark trust-module-mark" />
      </header>

      {live.length === 0 ? (
        <div className="trust-module-empty">
          <p>
            Vouches are written by people who worked with {firstName}, tied to real relationships
            and shared projects. Each one shows exactly what can be verified about it.
          </p>
        </div>
      ) : (
        <div className="trust-module-grid">
          <RadialCategories
            categories={categories}
            authorNames={authorNames}
            reduceMotion={reduceMotion}
            onOpen={(category) =>
              board.openInspector({
                mode: 'list',
                title: `${category.label} vouches`,
                vouchIds: category.vouchIds,
              })
            }
          />
          <VouchGraph constellation={constellation} />
        </div>
      )}

      <div className="trust-module-actions">
        <button
          type="button"
          className="instrument-quiet"
          disabled={live.length === 0}
          onClick={() => board.openInspector({ mode: 'list', title: 'All vouches' })}
        >
          Explore Vouches
        </button>
        {board.composer !== null ? (
          <VouchTrigger origin="vouch-trust-module" appearance="instrument" label="+ Vouch" />
        ) : signInHref !== null ? (
          <Link className="instrument-primary" href={signInHref}>
            + Vouch
          </Link>
        ) : null}
      </div>

      {categories.length === 0 ? null : (
        <div className="trust-accolades" aria-label="Accolades">
          <p className="instrument-label">ACCOLADES</p>
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <AccoladeEmblem category={category.id} tier={category.milestone.tier} size={40} />
                <span>
                  <strong>{category.label}</strong>
                  <small>
                    {category.milestone.label} · {category.count}{' '}
                    {category.count === 1 ? 'person' : 'people'}
                    {category.milestone.next === null
                      ? ''
                      : ` · next at ${category.milestone.next}`}
                  </small>
                </span>
                <span className="trust-accolade-pips" aria-hidden="true">
                  {[1, 2, 3, 4].map((tier) => (
                    <i
                      key={tier}
                      className={tier <= category.milestone.tier ? 'is-on' : undefined}
                    />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function RadialCategories({
  categories,
  authorNames,
  reduceMotion,
  onOpen,
}: {
  categories: SkillCategorySummary[];
  authorNames: Map<string, string>;
  reduceMotion: boolean;
  onOpen: (category: SkillCategorySummary) => void;
}) {
  const [focused, setFocused] = useState<string | null>(null);
  const shown = categories.slice(0, 8);
  const max = Math.max(...shown.map((category) => category.count), 1);
  return (
    <div className="trust-radial" role="group" aria-label="Vouched skill categories">
      <svg className="trust-radial-rings" viewBox="-100 -100 200 200" aria-hidden="true">
        <circle r="92" />
        <circle r="62" />
        <circle r="30" />
        {shown.map((category, index) => {
          const angle = (index / shown.length) * Math.PI * 2 - Math.PI / 2;
          const reach = 30 + (category.count / max) * 46;
          return (
            <motion.line
              key={category.id}
              x1={Math.cos(angle) * 30}
              y1={Math.sin(angle) * 30}
              x2={Math.cos(angle) * reach}
              y2={Math.sin(angle) * reach}
              className={focused === category.id ? 'is-active' : undefined}
              initial={reduceMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: reduceMotion ? 0 : 0.6,
                delay: reduceMotion ? 0 : index * 0.04,
              }}
            />
          );
        })}
      </svg>
      <div className="trust-radial-center" aria-hidden="true">
        <VouchMark size={30} />
      </div>
      {shown.map((category, index) => {
        const angle = (index / shown.length) * Math.PI * 2 - Math.PI / 2;
        const names = category.authorIds.map((id) => authorNames.get(id)).filter(Boolean);
        const tooltipId = `trust-tip-${category.id}`;
        return (
          <button
            key={category.id}
            type="button"
            className="trust-radial-node"
            style={{
              left: `${50 + Math.cos(angle) * 40}%`,
              top: `${50 + Math.sin(angle) * 40}%`,
            }}
            aria-describedby={tooltipId}
            aria-label={`${category.label}: ${category.count} ${category.count === 1 ? 'person' : 'people'}. Open their vouches.`}
            onMouseEnter={() => setFocused(category.id)}
            onMouseLeave={() => setFocused(null)}
            onFocus={() => setFocused(category.id)}
            onBlur={() => setFocused(null)}
            onClick={() => onOpen(category)}
          >
            <AccoladeEmblem category={category.id} tier={category.milestone.tier} size={30} />
            <span className="trust-radial-label">{category.label}</span>
            <span className="trust-radial-count">{category.count}</span>
            <span
              id={tooltipId}
              role="tooltip"
              className={focused === category.id ? 'trust-tip is-visible' : 'trust-tip'}
            >
              Vouched by {names.slice(0, 4).join(', ')}
              {names.length > 4 ? ` and ${names.length - 4} more` : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Constellation drawn only from real vouch edges returned by the graph query layer. */
function VouchGraph({ constellation }: { constellation: Constellation }) {
  const board = useVouchBoard();
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map(constellation.nodes.map((node) => [node.userId, node]));
    const edgeList = [...constellation.edges];
    for (const vouch of board.vouches) {
      if (vouch.hidden || vouch.moderationState !== 'ACTIVE') continue;
      if (!nodeMap.has(vouch.author.userId))
        nodeMap.set(vouch.author.userId, {
          userId: vouch.author.userId,
          slug: vouch.author.slug,
          name: vouch.author.name,
          initials:
            `${vouch.author.firstName[0] ?? ''}${vouch.author.lastName[0] ?? ''}`.toUpperCase(),
        });
      if (
        !edgeList.some(
          (edge) => edge.from === vouch.author.userId && edge.to === vouch.recipient.userId,
        )
      )
        edgeList.push({
          id: vouch.id,
          from: vouch.author.userId,
          to: vouch.recipient.userId,
          skills: vouch.skills,
        });
    }
    return { nodes: [...nodeMap.values()], edges: edgeList };
  }, [board.vouches, constellation]);
  const center = constellation.centerId;
  const others = nodes.filter((node) => node.userId !== center);
  const ring = others.length > 8 ? 78 : 70;
  const position = new Map<string, { x: number; y: number }>([[center, { x: 0, y: 0 }]]);
  others.forEach((node, index) => {
    const angle = (index / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2;
    position.set(node.userId, { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring });
  });
  return (
    <figure className="trust-graph">
      <figcaption className="instrument-label">VOUCH GRAPH</figcaption>
      <svg
        viewBox="-108 -108 216 216"
        role="img"
        aria-label={`Vouch graph: ${edges.length} vouches among ${nodes.length} people`}
      >
        <defs>
          <marker
            id="trust-graph-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L8,4 L0,8 Z" className="trust-graph-arrow" />
          </marker>
        </defs>
        <circle r={ring} className="trust-graph-ring" />
        {edges.map((edge) => {
          const from = position.get(edge.from);
          const to = position.get(edge.to);
          if (from === undefined || to === undefined) return null;
          const isDirect = edge.to === center || edge.from === center;
          let d: string;
          if (isDirect) {
            // Stop the line at the node edge so the arrowhead isn't hidden under the circle.
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const length = Math.hypot(dx, dy) || 1;
            const r = edge.to === center ? 15 : 11;
            const tx = to.x - (dx / length) * r;
            const ty = to.y - (dy / length) * r;
            d = `M${from.x} ${from.y} L${tx} ${ty}`;
          } else {
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            d = `M${from.x} ${from.y} Q${mx * 1.28} ${my * 1.28} ${to.x} ${to.y}`;
          }
          return (
            <path
              key={edge.id}
              d={d}
              markerEnd="url(#trust-graph-arrow)"
              className={isDirect ? 'trust-graph-edge is-direct' : 'trust-graph-edge'}
            />
          );
        })}
        {nodes.map((node) => {
          const point = position.get(node.userId);
          if (point === undefined) return null;
          const isCenter = node.userId === center;
          const body = (
            <>
              <title>{node.name}</title>
              {isCenter ? <circle cx={0} cy={0} r={18} className="trust-graph-halo" /> : null}
              <circle
                cx={point.x}
                cy={point.y}
                r={isCenter ? 12 : 9}
                className={isCenter ? 'trust-graph-node is-center' : 'trust-graph-node'}
              />
              <text
                x={point.x}
                y={point.y}
                dy="0.35em"
                textAnchor="middle"
                className={isCenter ? 'trust-graph-initials is-center' : 'trust-graph-initials'}
              >
                {node.initials}
              </text>
              {!isCenter ? (
                <text x={point.x} y={point.y + 15} textAnchor="middle" className="trust-graph-name">
                  {node.name.split(' ')[0]}
                </text>
              ) : null}
            </>
          );
          return node.slug === '' || isCenter ? (
            <g key={node.userId}>{body}</g>
          ) : (
            <a key={node.userId} href={`/vouch/${node.slug}`} aria-label={node.name}>
              {body}
            </a>
          );
        })}
      </svg>
      <p className="instrument-muted">
        {edges.length} real {edges.length === 1 ? 'vouch' : 'vouches'} among {nodes.length} people
      </p>
    </figure>
  );
}
