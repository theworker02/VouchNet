export const employmentTypes = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'FREELANCE',
  'INTERNSHIP',
  'APPRENTICESHIP',
] as const;
export type EmploymentType = (typeof employmentTypes)[number];

export const employmentTypeLabels: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  FREELANCE: 'Freelance',
  INTERNSHIP: 'Internship',
  APPRENTICESHIP: 'Apprenticeship',
};

export const locationTypes = ['ON_SITE', 'HYBRID', 'REMOTE'] as const;
export type LocationType = (typeof locationTypes)[number];

export const locationTypeLabels: Record<LocationType, string> = {
  ON_SITE: 'On-site',
  HYBRID: 'Hybrid',
  REMOTE: 'Remote',
};

export const rateUnits = ['HOURLY', 'FIXED', 'STARTING_AT'] as const;
export type RateUnit = (typeof rateUnits)[number];

export const rateUnitLabels: Record<RateUnit, string> = {
  HOURLY: 'per hour',
  FIXED: 'fixed price',
  STARTING_AT: 'starting at',
};

/** Curated languages a member can put on their profile — purposeful, not an open text field. */
export const profileLanguages = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Rust',
  'Go',
  'Ruby',
  'Java',
  'Kotlin',
  'Swift',
  'C',
  'C++',
  'C#',
  'PHP',
  'Scala',
  'Elixir',
  'Haskell',
  'Lua',
  'Dart',
  'R',
  'Julia',
  'Zig',
  'OCaml',
  'Clojure',
  'Erlang',
  'SQL',
  'HTML/CSS',
  'Shell',
  'Solidity',
  'Assembly',
  'MATLAB',
] as const;
export type ProfileLanguage = (typeof profileLanguages)[number];
export const profileLanguageSet = new Set<string>(profileLanguages);

export const monthLabels = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
