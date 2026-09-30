import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const siteUrl = new URL(process.env.APP_URL?.trim() || 'https://vouchnet.dev');

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: 'VouchNet | Professional context, not professional noise',
    template: '%s | VouchNet',
  },
  description:
    'Build a credible professional identity around your work, trusted peer signals, and transparent opportunities.',
  applicationName: 'VouchNet',
  icons: {
    icon: [{ url: '/brand/vouchnet-mark.png', type: 'image/png' }],
    shortcut: '/brand/vouchnet-mark.png',
  },
  keywords: [
    'professional network',
    'professional profile',
    'proof of work',
    'technical jobs',
    'career portfolio',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'VouchNet',
    title: 'VouchNet | Professional context, not professional noise',
    description:
      'A professional identity built around work, peer context, and transparent opportunities.',
  },
  twitter: {
    card: 'summary',
    title: 'VouchNet | Professional context, not professional noise',
    description:
      'A professional identity built around work, peer context, and transparent opportunities.',
  },
  verification:
    process.env.GOOGLE_SITE_VERIFICATION === undefined ||
    process.env.GOOGLE_SITE_VERIFICATION.length === 0
      ? undefined
      : { google: process.env.GOOGLE_SITE_VERIFICATION },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const analyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          id="vouch-net-organization-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                name: 'VouchNet',
                url: siteUrl.origin,
                description:
                  'A professional network built around credible work, trusted peer signals, and transparent opportunities.',
              },
              {
                '@type': 'WebSite',
                name: 'VouchNet',
                url: siteUrl.origin,
                description:
                  'Professional context, proof of work, and transparent technical opportunities.',
              },
            ],
          })}
        </Script>
        {analyticsToken === undefined || analyticsToken.length === 0 ? null : (
          <Script
            strategy="afterInteractive"
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: analyticsToken, spa: true })}
          />
        )}
      </body>
    </html>
  );
}
