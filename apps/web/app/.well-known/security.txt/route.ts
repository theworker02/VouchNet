export const dynamic = 'force-static';

const securityText = `Contact: https://github.com/theworker02/VouchNet/security/advisories/new
Policy: https://vouchnet.dev/security
Canonical: https://vouchnet.dev/.well-known/security.txt
Preferred-Languages: en
Expires: 2027-10-01T00:00:00.000Z
`;

/** RFC 9116 discovery endpoint. Keep it text/plain and avoid redirecting security researchers. */
export function GET() {
  return new Response(securityText, {
    headers: {
      'Cache-Control': 'public, max-age=86400',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
