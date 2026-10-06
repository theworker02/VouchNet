import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Inventory guard: every route under the public API surfaces must either enforce the prepaid
 * credit gate or be listed here with the reason it is not a metered third-party call. Adding a new
 * public API or MCP route without deciding how it is metered fails this test.
 */
const appDirectory = fileURLToPath(new URL('..', import.meta.url));
const publicSurfaces = ['api/v1', 'api/oauth', 'api/mcp', 'mcp'];

const exempt: Record<string, string> = {
  'api/v1/me/route.ts':
    'first-party session-cookie read model; not reachable with client credentials',
  'api/v1/status/route.ts': 'unauthenticated health check for load balancers',
  'api/v1/resumes/download/route.ts':
    'signed single-resume capability link, not a client credential (storage adapter not live)',
  'api/oauth/authorize/route.ts': 'member consent form submitted from the VouchNet browser session',
};

function routes(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return routes(path);
    return entry === 'route.ts' ? [path] : [];
  });
}

const gate = /insufficientCreditsResponse|chargeApiCall|spendCredits/;

function isGated(file: string, seen = new Set<string>()): boolean {
  if (seen.has(file)) return false;
  seen.add(file);
  const source = readFileSync(file, 'utf8');
  if (gate.test(source)) return true;
  // Aliases such as candidate-profile and v1/oauth/token delegate to a gated route.
  const delegates = [...source.matchAll(/from '(\.[^']+\/route)'/g)].map((match) =>
    join(file, '..', `${match[1]}.ts`),
  );
  return delegates.length > 0 && delegates.every((target) => isGated(target, seen));
}

describe('public API and MCP entry points', () => {
  const discovered = publicSurfaces
    .flatMap((surface) => routes(join(appDirectory, surface)))
    .map((file) => relative(appDirectory, file).split(sep).join('/'))
    .sort();

  it('finds the known public API routes', () => {
    expect(discovered).toEqual(
      expect.arrayContaining([
        'api/oauth/token/route.ts',
        'api/oauth/userinfo/route.ts',
        'api/v1/oauth/applicant-data/route.ts',
        'api/v1/oauth/candidate-profile/route.ts',
        'api/v1/oauth/token/route.ts',
      ]),
    );
  });

  it.each(discovered)('%s is credit-gated or explicitly exempt', (route) => {
    if (route in exempt) return;
    expect(isGated(join(appDirectory, route)), `${route} must enforce prepaid credits`).toBe(true);
  });

  it('keeps the exemption list current', () => {
    for (const route of Object.keys(exempt)) expect(discovered).toContain(route);
  });
});
