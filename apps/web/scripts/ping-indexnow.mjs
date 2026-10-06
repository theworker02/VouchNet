/**
 * Submits VouchNet URLs to IndexNow (Bing, Yandex, Naver, Seznam and other participating engines).
 * Usage: node apps/web/scripts/ping-indexnow.mjs [baseUrl]
 * Requires the key file public/<INDEXNOW_KEY>.txt to be deployed at the site root.
 */
const key = '0f113c2788018432fbd3afcd37d3b506';
const host = process.env.APP_HOST ?? 'vouchnet.dev';
const baseUrl = process.argv[2] ?? `https://${host}`;

const response = await fetch(`${baseUrl}/sitemap.xml`);
if (!response.ok) throw new Error(`sitemap fetch failed: ${response.status}`);
const xml = await response.text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (urlList.length === 0) throw new Error('sitemap contained no urls');

const result = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    host,
    key,
    keyLocation: `${baseUrl}/${key}.txt`,
    urlList,
  }),
});
console.log(`IndexNow ${result.status} for ${urlList.length} urls on ${host}`);
