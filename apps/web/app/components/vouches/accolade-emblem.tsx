import type { SkillCategoryId } from '../../lib/skill-categories';

/**
 * Inline SVG emblem per skill category. Milestone tiers add restrained concentric rings rather
 * than colors or medals, so the system stays inside the existing palette.
 */
const glyphs: Record<SkillCategoryId, string> = {
  ENGINEERING: 'M11 12l-4 4 4 4M21 12l4 4-4 4M18 10l-4 12',
  SYSTEMS: 'M9 10h14v5H9zM9 17h14v5H9zM12 12.5h.01M12 19.5h.01',
  BACKEND:
    'M10 11c0-1.7 12-1.7 12 0v10c0 1.7-12 1.7-12 0zM10 11c0 1.7 12 1.7 12 0M10 16c0 1.7 12 1.7 12 0',
  FRONTEND: 'M8 10h16v12H8zM8 13.5h16M11 11.8h.01M13 11.8h.01',
  DESIGN: 'M16 8l7 12H9zM16 14v.01',
  RELIABILITY: 'M16 8l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8v-5zM13 16l2 2 4-4',
  OPEN_SOURCE: 'M16 8a8 8 0 0 1 3 15.4L17.3 19a3 3 0 1 0-2.6 0L13 23.4A8 8 0 0 1 16 8z',
  LEADERSHIP: 'M10 22l2-9 4 4 4-4 2 9zM12 13l-2-3M20 13l2-3M16 17l0-6',
  WRITING: 'M10 22l2-6 9-9 4 4-9 9zM18 10l4 4',
  RESEARCH: 'M14 9a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM18 18l5 5',
  CRAFT: 'M16 9l2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.3-4.4 2.3.8-5-3.6-3.5 5-.7z',
};

export function AccoladeEmblem({
  category,
  tier,
  size = 44,
  label,
}: {
  category: SkillCategoryId;
  tier: 0 | 1 | 2 | 3 | 4;
  size?: number;
  label?: string;
}) {
  return (
    <svg
      className="accolade-emblem"
      data-tier={tier}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={label === undefined ? undefined : 'img'}
      aria-hidden={label === undefined ? true : undefined}
      aria-label={label}
      focusable="false"
    >
      <circle className="accolade-emblem-plate" cx="16" cy="16" r="13" />
      {tier >= 2 ? <circle className="accolade-emblem-ring" cx="16" cy="16" r="14.6" /> : null}
      {tier >= 3 ? (
        <circle
          className="accolade-emblem-ring"
          cx="16"
          cy="16"
          r="15.6"
          strokeDasharray="1.2 1.6"
        />
      ) : null}
      {tier >= 4 ? <circle className="accolade-emblem-core" cx="16" cy="16" r="11" /> : null}
      <path className="accolade-emblem-glyph" d={glyphs[category]} />
    </svg>
  );
}
