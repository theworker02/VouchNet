export const reservedSlugs = new Set([
  'admin',
  'api',
  'login',
  'signup',
  'settings',
  'support',
  'security',
  'mcp',
  'developers',
  'company',
  'jobs',
  'network',
  'search',
]);
export type ProfileVisibility = 'PUBLIC' | 'MEMBERS' | 'CONNECTIONS' | 'PRIVATE';
export function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(slug) && !reservedSlugs.has(slug);
}
export function profileCompletion(input: {
  avatar: boolean;
  headline: boolean;
  about: boolean;
  experience: boolean;
  education: boolean;
  skills: boolean;
  projects: boolean;
  links: boolean;
}) {
  const missing = (Object.entries(input) as [keyof typeof input, boolean][])
    .filter(([, filled]) => !filled)
    .map(([key]) => key);
  return { percentage: Math.round(((8 - missing.length) / 8) * 100), missing };
}
export function canViewProfile(input: {
  visibility: ProfileVisibility;
  viewerIsOwner: boolean;
  viewerIsMember: boolean;
  isConnection: boolean;
  blocked: boolean;
}): boolean {
  if (input.blocked) return false;
  if (input.viewerIsOwner || input.visibility === 'PUBLIC') return true;
  if (input.visibility === 'MEMBERS') return input.viewerIsMember;
  return input.visibility === 'CONNECTIONS' ? input.isConnection : false;
}
