import { getPublicProject } from '../../../../lib/projects';

function escapeSvg(value: string) {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character] ??
      character,
  );
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const project = await getPublicProject((await params).slug);
  if (project === null) return new Response('Not found', { status: 404 });
  const name = escapeSvg(project.name.slice(0, 42));
  const tags = escapeSvg((project.tags.slice(0, 3).join(' · ') || 'Documented work').slice(0, 52));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="96" role="img" aria-label="${name} on VouchNet"><rect width="420" height="96" rx="14" fill="#111a2e"/><rect x="12" y="12" width="72" height="72" rx="12" fill="#e8efff"/><path d="M32 49h31M48 33v31" stroke="#315fda" stroke-width="5" stroke-linecap="round"/><text x="102" y="40" fill="#f4f7ff" font-family="Arial,sans-serif" font-size="17" font-weight="700">${name}</text><text x="102" y="63" fill="#b9c6de" font-family="Arial,sans-serif" font-size="12">${tags}</text><text x="102" y="80" fill="#80a5ff" font-family="Arial,sans-serif" font-size="10" font-weight="700">VOUCHNET · PROJECT RECORD</text></svg>`;
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
