import type { MetadataRoute } from 'next';

const siteUrl = process.env.APP_URL?.trim() || 'https://vouchnet.dev';

/** Keep search engines on the public product surface and away from account/private routes. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/auth/',
        // Public developer documentation is intentionally crawlable. Authenticated client
        // management stays out of search results below.
        '/developers/apps',
        '/feed',
        '/home',
        '/in/*/analytics',
        '/login',
        '/messaging',
        '/mynetwork',
        '/network/',
        '/notifications',
        '/oauth/',
        '/onboarding',
        '/saved',
        '/search',
        '/settings/',
        '/signup',
        '/verify',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
