import { NextResponse } from 'next/server';

export function GET(request: Request) {
  const baseUrl = new URL(request.url).origin;
  return NextResponse.json(
    {
      name: 'VouchNet Developer Resources',
      documentation: `${baseUrl}/developers`,
      integrationGuide: `${baseUrl}/developers/integrations`,
      serverIntegration: `${baseUrl}/developers/servers`,
      applyWithVouchNet: {
        status: 'available',
        authorize: `${baseUrl}/oauth/authorize`,
        token: `${baseUrl}/api/oauth/token`,
        userinfo: `${baseUrl}/api/oauth/userinfo`,
        registration: `${baseUrl}/settings/developers/clients`,
      },
      mcp: { status: 'planned', documentation: `${baseUrl}/developers/mcp` },
      publicProfileTemplate: `${baseUrl}/vouch/{username}`,
      authentication: { providerOAuth: 'available', clientRegistration: 'member_managed' },
    },
    { headers: { 'cache-control': 'public, max-age=3600' } },
  );
}
