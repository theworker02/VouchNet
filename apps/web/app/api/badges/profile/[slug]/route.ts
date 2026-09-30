import { getVisibleProfile } from '../../../../lib/people';

function escapeSvg(value: string) {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character] ??
      character,
  );
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const profile = await getVisibleProfile(null, (await params).slug);
  if (profile === null) return new Response('Not found', { status: 404 });
  const name = escapeSvg(`${profile.firstName} ${profile.lastName}`.slice(0, 42));
  const headline = escapeSvg((profile.headline ?? 'VouchNet professional').slice(0, 52));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="96" role="img" aria-label="${name} on VouchNet"><defs><linearGradient id="a" x1="0" x2="1"><stop stop-color="#315fda"/><stop offset="1" stop-color="#7658c6"/></linearGradient></defs><rect width="420" height="96" rx="14" fill="#111a2e"/><rect x="12" y="12" width="72" height="72" rx="12" fill="url(#a)"/><text x="48" y="57" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="29" font-weight="700">V</text><text x="102" y="40" fill="#f4f7ff" font-family="Arial,sans-serif" font-size="17" font-weight="700">${name}</text><text x="102" y="63" fill="#b9c6de" font-family="Arial,sans-serif" font-size="12">${headline}</text><text x="102" y="80" fill="#80a5ff" font-family="Arial,sans-serif" font-size="10" font-weight="700">VOUCHNET · PROFESSIONAL PROFILE</text></svg>`;
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
