/**
 * Skill categories group free-form vouch skills into a small set of accolades. Matching is a
 * transparent keyword table, not a model: anything unmatched is shown under "Craft".
 */
export const skillCategories = [
  {
    id: 'ENGINEERING',
    label: 'Engineering',
    keywords: [
      'engineering',
      'software',
      'typescript',
      'javascript',
      'python',
      'go',
      'golang',
      'java',
      'kotlin',
      'swift',
      'programming',
      'code',
      'testing',
    ],
  },
  {
    id: 'SYSTEMS',
    label: 'Systems',
    keywords: [
      'rust',
      'c++',
      'cpp',
      'c',
      'systems',
      'performance',
      'embedded',
      'kernel',
      'compilers',
      'wasm',
      'webassembly',
    ],
  },
  {
    id: 'BACKEND',
    label: 'Backend',
    keywords: [
      'backend',
      'api',
      'apis',
      'database',
      'postgres',
      'postgresql',
      'sql',
      'distributed',
      'node',
      'node.js',
      'graphql',
    ],
  },
  {
    id: 'FRONTEND',
    label: 'Frontend',
    keywords: [
      'frontend',
      'react',
      'next.js',
      'css',
      'web',
      'svelte',
      'vue',
      'accessibility',
      'a11y',
    ],
  },
  {
    id: 'DESIGN',
    label: 'UI/UX',
    keywords: [
      'design',
      'ui',
      'ux',
      'ui/ux',
      'product design',
      'interaction',
      'figma',
      'visual',
      'research ux',
    ],
  },
  {
    id: 'RELIABILITY',
    label: 'Reliability',
    keywords: [
      'reliability',
      'devops',
      'sre',
      'infrastructure',
      'kubernetes',
      'cloud',
      'ops',
      'observability',
      'reliable',
      'ci',
      'security',
    ],
  },
  {
    id: 'OPEN_SOURCE',
    label: 'Open Source',
    keywords: ['open source', 'open-source', 'oss', 'maintainer', 'maintenance', 'community'],
  },
  {
    id: 'LEADERSHIP',
    label: 'Leadership',
    keywords: [
      'leadership',
      'project leadership',
      'management',
      'mentoring',
      'mentorship',
      'strategy',
      'product',
      'product management',
      'hiring',
    ],
  },
  {
    id: 'WRITING',
    label: 'Writing',
    keywords: [
      'technical writing',
      'writing',
      'documentation',
      'docs',
      'communication',
      'teaching',
    ],
  },
  {
    id: 'RESEARCH',
    label: 'Research & Data',
    keywords: [
      'research',
      'data',
      'data science',
      'machine learning',
      'ml',
      'statistics',
      'analytics',
      'cryptography',
      'math',
    ],
  },
] as const;

export type SkillCategoryId = (typeof skillCategories)[number]['id'] | 'CRAFT';

export const categoryLabels: Record<SkillCategoryId, string> = {
  ...(Object.fromEntries(
    skillCategories.map((category) => [category.id, category.label]),
  ) as Record<(typeof skillCategories)[number]['id'], string>),
  CRAFT: 'Craft',
};

export function categoryForSkill(skill: string): SkillCategoryId {
  const normalized = skill.trim().toLowerCase();
  for (const category of skillCategories)
    if ((category.keywords as readonly string[]).includes(normalized)) return category.id;
  for (const category of skillCategories)
    if (
      (category.keywords as readonly string[]).some(
        (keyword) => keyword.length > 3 && normalized.includes(keyword),
      )
    )
      return category.id;
  return 'CRAFT';
}

/** Descriptive milestones by distinct vouch count. They describe history, not status. */
export const accoladeMilestones = [
  { tier: 1, minimum: 1, label: 'Noted' },
  { tier: 2, minimum: 3, label: 'Recognized' },
  { tier: 3, minimum: 7, label: 'Proven' },
  { tier: 4, minimum: 15, label: 'Exemplary' },
] as const;

export function milestoneFor(count: number): {
  tier: 0 | 1 | 2 | 3 | 4;
  label: string;
  next: number | null;
} {
  let current: { tier: 0 | 1 | 2 | 3 | 4; label: string } = { tier: 0, label: 'Not yet vouched' };
  for (const milestone of accoladeMilestones)
    if (count >= milestone.minimum) current = { tier: milestone.tier, label: milestone.label };
  const next = accoladeMilestones.find((milestone) => milestone.minimum > count)?.minimum ?? null;
  return { ...current, next };
}

export type CategorizableVouch = { id: string; authorId: string; skills: readonly string[] };

export type SkillCategorySummary = {
  id: SkillCategoryId;
  label: string;
  /** Distinct people who vouched for at least one skill in this category. */
  count: number;
  skills: string[];
  vouchIds: string[];
  authorIds: string[];
  milestone: ReturnType<typeof milestoneFor>;
};

export function summarizeSkillCategories(
  vouches: readonly CategorizableVouch[],
): SkillCategorySummary[] {
  const map = new Map<
    SkillCategoryId,
    { skills: Set<string>; vouchIds: Set<string>; authorIds: Set<string> }
  >();
  for (const vouch of vouches) {
    for (const skill of vouch.skills) {
      const id = categoryForSkill(skill);
      const entry = map.get(id) ?? { skills: new Set(), vouchIds: new Set(), authorIds: new Set() };
      entry.skills.add(skill);
      entry.vouchIds.add(vouch.id);
      entry.authorIds.add(vouch.authorId);
      map.set(id, entry);
    }
  }
  return [...map.entries()]
    .map(([id, entry]) => ({
      id,
      label: categoryLabels[id],
      count: entry.authorIds.size,
      skills: [...entry.skills],
      vouchIds: [...entry.vouchIds],
      authorIds: [...entry.authorIds],
      milestone: milestoneFor(entry.authorIds.size),
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export const suggestedSkills = [
  'Software Engineering',
  'Rust',
  'TypeScript',
  'Backend',
  'Frontend',
  'UI/UX',
  'Project Leadership',
  'Open Source',
  'Technical Writing',
  'Reliability',
  'Security',
  'PostgreSQL',
  'Accessibility',
  'Product Design',
  'Mentoring',
  'Research',
  'Data Science',
  'DevOps',
  'Python',
  'Documentation',
] as const;
