import { NextResponse } from 'next/server';

export function GET(request: Request) {
  // Netlify route handlers may receive an internal deployment hostname; published links stay canonical.
  const baseUrl = process.env.APP_URL ?? new URL(request.url).origin;
  return NextResponse.json(
    {
      name: 'VouchNet Developer Resources',
      documentation: `${baseUrl}/developers`,
      integrationGuide: `${baseUrl}/developers/integrations`,
      serverIntegration: `${baseUrl}/developers/servers`,
      apiClientPackage: {
        name: '@theworker02/vouchnet-api-client',
        registry: 'https://npm.pkg.github.com',
        docs: 'https://github.com/theworker02/VouchNet/blob/main/docs/API_CLIENT.md',
      },
      applyWithVouchNet: {
        status: 'available',
        authorize: `${baseUrl}/oauth/authorize`,
        token: `${baseUrl}/api/oauth/token`,
        userinfo: `${baseUrl}/api/oauth/userinfo`,
        applicantData: `${baseUrl}/api/v1/oauth/applicant-data`,
        registration: `${baseUrl}/settings/developers/clients`,
      },
      directoryApi: {
        status: 'available',
        scope: 'directory:read',
        people: `${baseUrl}/api/v1/people/{slug}`,
        organizations: `${baseUrl}/api/v1/organizations/{slug}`,
        jobs: `${baseUrl}/api/v1/jobs`,
        rateLimit: { maxRequests: 60, windowSeconds: 60 },
      },
      mcp: { status: 'planned', documentation: `${baseUrl}/developers/mcp` },
      publicProfileTemplate: `${baseUrl}/vouch/{username}`,
      authentication: { providerOAuth: 'available', clientRegistration: 'member_managed' },
    },
    { headers: { 'cache-control': 'public, max-age=3600' } },
  );
}
