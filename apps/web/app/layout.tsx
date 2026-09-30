import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'VouchNet',
  description: 'A professional network where humans participate and AI assists.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const analyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
  return (
    <html lang="en">
      <body>
        {children}
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
