/** A public, typed client for VouchNet OAuth 2.0 endpoints. */

export const DEFAULT_VOUCHNET_API_ORIGIN = 'https://vouchnet.dev';

export const vouchNetScopes = [
  'profile:read',
  'profile:email',
  'resume:read',
  'skills:verify',
  'directory:read',
] as const;

export type VouchNetScope = (typeof vouchNetScopes)[number];

export type VouchNetToken = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope: VouchNetScope[];
};

export type VouchNetProfile = {
  sub: string;
  profile_url: string;
  name: string;
  given_name: string;
  family_name: string;
  headline: string | null;
  email?: string;
};

export type VouchNetApplicantData = {
  vouch_id: string;
  personal_info: VouchNetProfile;
  work_experience: unknown[];
  verified_skills: unknown[];
  resume: null;
};

export type VouchNetPerson = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  name: string;
  headline: string | null;
  location: string | null;
  about: string | null;
  languages: string[];
  early_member: boolean;
  is_plus: boolean;
  profile_url: string;
  visibility: string;
};

export type VouchNetOrganization = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  website_url: string;
  careers_url: string | null;
  engineering_url: string | null;
  repository_url: string | null;
  headquarters: string | null;
  verification_status: string;
  technologies: Array<{ name: string; category: string; sourceUrl: string }>;
  organization_url: string;
};

export type VouchNetJob = {
  slug: string;
  title: string;
  summary: string;
  location: string;
  workplace_type: string;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  skill_tags: string[];
  source_url: string;
  source_status: string;
  organization_name: string;
  organization_slug: string;
  job_url: string;
};

export type VouchNetApiErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_TOKEN'
  | 'RATE_LIMITED'
  | 'RATE_LIMIT_UNAVAILABLE'
  | 'INSUFFICIENT_CREDITS'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE';

export class VouchNetApiError extends Error {
  constructor(
    readonly code: VouchNetApiErrorCode,
    readonly status: number,
    readonly retryAfterSeconds?: number,
    readonly response?: unknown,
  ) {
    super(`VouchNet API request failed: ${code} (${status})`);
    this.name = 'VouchNetApiError';
  }
}

export type VouchNetClientOptions = {
  /** Defaults to the public VouchNet service. */
  origin?: string;
  /** Enables deterministic testing or a platform-native fetch implementation. */
  fetch?: typeof fetch;
};

export type AuthorizationUrlInput = {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scopes: readonly VouchNetScope[];
};

export type AuthorizationCodeExchangeInput = {
  clientId: string;
  /** Server-side confidential client credential. Never ship this to a browser. */
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
};

export type PkcePair = { codeVerifier: string; codeChallenge: string };

function assertNonBlank(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be blank.`);
}

function originUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost'))
    throw new Error('VouchNet API origin must use HTTPS (or localhost HTTP).');
  return new URL(url.origin);
}

function parseRetryAfter(response: Response, payload: unknown): number | undefined {
  const fromHeader = Number(response.headers.get('retry-after'));
  if (Number.isFinite(fromHeader) && fromHeader >= 0) return Math.ceil(fromHeader);
  if (!isRecord(payload) || !isRecord(payload.error)) return undefined;
  const candidate = payload.error.retryAfterSeconds;
  return typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0
    ? Math.ceil(candidate)
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorCode(payload: unknown, status: number): VouchNetApiErrorCode {
  if (isRecord(payload)) {
    if (typeof payload.error === 'string' && payload.error === 'INSUFFICIENT_CREDITS')
      return 'INSUFFICIENT_CREDITS';
    if (isRecord(payload.error) && typeof payload.error.code === 'string') {
      if (payload.error.code === 'RATE_LIMITED') return 'RATE_LIMITED';
      if (payload.error.code === 'RATE_LIMIT_UNAVAILABLE') return 'RATE_LIMIT_UNAVAILABLE';
    }
  }
  if (status === 401) return 'INVALID_TOKEN';
  if (status === 400) return 'INVALID_REQUEST';
  return 'HTTP_ERROR';
}

function parseScopes(value: unknown): VouchNetScope[] {
  if (typeof value !== 'string') return [];
  return value
    .split(/\s+/)
    .filter((scope): scope is VouchNetScope =>
      (vouchNetScopes as readonly string[]).includes(scope),
    );
}

function parseToken(payload: unknown): VouchNetToken {
  if (
    !isRecord(payload) ||
    typeof payload.access_token !== 'string' ||
    payload.token_type !== 'Bearer' ||
    typeof payload.expires_in !== 'number' ||
    !Number.isFinite(payload.expires_in)
  )
    throw new VouchNetApiError('INVALID_RESPONSE', 502, undefined, payload);
  return {
    accessToken: payload.access_token,
    tokenType: 'Bearer',
    expiresIn: payload.expires_in,
    scope: parseScopes(payload.scope),
  };
}

function parseProfile(payload: unknown): VouchNetProfile {
  if (
    !isRecord(payload) ||
    typeof payload.sub !== 'string' ||
    typeof payload.profile_url !== 'string' ||
    typeof payload.name !== 'string' ||
    typeof payload.given_name !== 'string' ||
    typeof payload.family_name !== 'string' ||
    (payload.headline !== null && typeof payload.headline !== 'string')
  )
    throw new VouchNetApiError('INVALID_RESPONSE', 502, undefined, payload);
  return {
    sub: payload.sub,
    profile_url: payload.profile_url,
    name: payload.name,
    given_name: payload.given_name,
    family_name: payload.family_name,
    headline: payload.headline,
    ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
  };
}

export function createVouchNetClient(options: VouchNetClientOptions = {}) {
  const origin = originUrl(options.origin ?? DEFAULT_VOUCHNET_API_ORIGIN);
  const fetcher = options.fetch ?? globalThis.fetch;
  if (typeof fetcher !== 'function') throw new Error('A Fetch implementation is required.');

  async function request(path: string, init: RequestInit): Promise<unknown> {
    const response = await fetcher(new URL(path, origin), init);
    let payload: unknown = null;
    try {
      payload = (await response.json()) as unknown;
    } catch {
      // API errors are still surfaced with status even if an intermediary returns non-JSON.
    }
    if (!response.ok)
      throw new VouchNetApiError(
        errorCode(payload, response.status),
        response.status,
        parseRetryAfter(response, payload),
        payload,
      );
    return payload;
  }

  return {
    createAuthorizationUrl(input: AuthorizationUrlInput): string {
      assertNonBlank(input.clientId, 'clientId');
      assertNonBlank(input.redirectUri, 'redirectUri');
      assertNonBlank(input.state, 'state');
      assertNonBlank(input.codeChallenge, 'codeChallenge');
      if (input.scopes.length === 0) throw new Error('At least one VouchNet scope is required.');
      const url = new URL('/oauth/authorize', origin);
      url.searchParams.set('client_id', input.clientId);
      url.searchParams.set('redirect_uri', input.redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', input.scopes.join(' '));
      url.searchParams.set('state', input.state);
      url.searchParams.set('code_challenge', input.codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');
      return url.toString();
    },

    async exchangeAuthorizationCode(input: AuthorizationCodeExchangeInput): Promise<VouchNetToken> {
      const form = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: input.clientId,
        client_secret: input.clientSecret,
        code: input.code,
        redirect_uri: input.redirectUri,
        code_verifier: input.codeVerifier,
      });
      return parseToken(
        await request('/api/v1/oauth/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
          cache: 'no-store',
        }),
      );
    },

    async getUserInfo(accessToken: string): Promise<VouchNetProfile> {
      assertNonBlank(accessToken, 'accessToken');
      return parseProfile(
        await request('/api/oauth/userinfo', {
          headers: { authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }),
      );
    },

    async getApplicantData(accessToken: string): Promise<VouchNetApplicantData> {
      assertNonBlank(accessToken, 'accessToken');
      const payload = await request('/api/v1/oauth/applicant-data', {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (
        !isRecord(payload) ||
        typeof payload.vouch_id !== 'string' ||
        !Array.isArray(payload.work_experience) ||
        !Array.isArray(payload.verified_skills) ||
        payload.resume !== null
      )
        throw new VouchNetApiError('INVALID_RESPONSE', 502, undefined, payload);
      return {
        vouch_id: payload.vouch_id,
        personal_info: parseProfile(payload.personal_info),
        work_experience: payload.work_experience,
        verified_skills: payload.verified_skills,
        resume: null,
      };
    },

    /** Public person directory lookup. Requires the `directory:read` scope. */
    async getPerson(accessToken: string, slug: string): Promise<VouchNetPerson> {
      assertNonBlank(accessToken, 'accessToken');
      assertNonBlank(slug, 'slug');
      const payload = await request(`/api/v1/people/${encodeURIComponent(slug)}`, {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (
        !isRecord(payload) ||
        typeof payload.id !== 'string' ||
        typeof payload.slug !== 'string' ||
        typeof payload.name !== 'string'
      )
        throw new VouchNetApiError('INVALID_RESPONSE', 502, undefined, payload);
      return payload as VouchNetPerson;
    },

    /** Public organization directory lookup. Requires the `directory:read` scope. */
    async getOrganization(accessToken: string, slug: string): Promise<VouchNetOrganization> {
      assertNonBlank(accessToken, 'accessToken');
      assertNonBlank(slug, 'slug');
      const payload = await request(`/api/v1/organizations/${encodeURIComponent(slug)}`, {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (
        !isRecord(payload) ||
        typeof payload.slug !== 'string' ||
        typeof payload.name !== 'string'
      )
        throw new VouchNetApiError('INVALID_RESPONSE', 502, undefined, payload);
      return payload as VouchNetOrganization;
    },

    /** Salary-forward public jobs directory. Requires the `directory:read` scope. */
    async listJobs(
      accessToken: string,
      input: { query?: string; limit?: number } = {},
    ): Promise<{ query: string | null; jobs: VouchNetJob[] }> {
      assertNonBlank(accessToken, 'accessToken');
      const url = new URL('/api/v1/jobs', origin);
      if (input.query) url.searchParams.set('q', input.query);
      if (input.limit !== undefined) url.searchParams.set('limit', String(input.limit));
      const payload = await request(`${url.pathname}${url.search}`, {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!isRecord(payload) || !Array.isArray(payload.jobs))
        throw new VouchNetApiError('INVALID_RESPONSE', 502, undefined, payload);
      return {
        query: typeof payload.query === 'string' ? payload.query : null,
        jobs: payload.jobs as VouchNetJob[],
      };
    },
  };
}

/** Creates a cryptographically random PKCE S256 pair for a browser or server OAuth client. */
export async function createPkcePair(): Promise<PkcePair> {
  if (globalThis.crypto?.getRandomValues === undefined || globalThis.crypto.subtle === undefined)
    throw new Error('Web Crypto is required to create a PKCE pair.');
  const bytes = new Uint8Array(64);
  globalThis.crypto.getRandomValues(bytes);
  const codeVerifier = toBase64Url(bytes);
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier),
  );
  return { codeVerifier, codeChallenge: toBase64Url(new Uint8Array(digest)) };
}

function toBase64Url(bytes: Uint8Array): string {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}
