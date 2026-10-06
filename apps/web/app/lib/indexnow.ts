import 'server-only';

/**
 * IndexNow submission. One POST to api.indexnow.org reaches every participating engine
 * (Bing, Yandex, Naver, Seznam, …), so URLs are never submitted per-engine.
 * The key file must exist at the site root as public/<KEY>.txt containing only the key.
 * Only public, indexable URLs may be submitted — never authenticated, messaging, settings,
 * admin, verification, or token-bearing routes.
 */
export const INDEXNOW_KEY = '0f113c2788018432fbd3afcd37d3b506';

const siteOrigin = () =>
  (process.env.APP_URL?.trim() || 'https://vouchnet.dev').replace(/\/+$/, '');

/**
 * Fire-and-forget submission of new, updated, or deleted public URLs.
 * Accepts site-relative paths or absolute URLs. Never throws — indexing is best-effort
 * and must not delay or fail a product mutation.
 */
export function submitToIndexNow(urls: string | string[]): void {
  const urlList = (Array.isArray(urls) ? urls : [urls])
    .map((url) => (url.startsWith('http') ? url : `${siteOrigin()}${url}`))
    .filter((url) => url.startsWith('https://'))
    .slice(0, 10000);
  if (urlList.length === 0) return;
  const origin = siteOrigin();
  void fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json;charset=utf-8' },
    body: JSON.stringify({
      host: new URL(origin).host,
      key: INDEXNOW_KEY,
      keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
  }).catch(() => {});
}
