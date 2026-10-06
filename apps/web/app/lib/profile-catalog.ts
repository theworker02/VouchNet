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
