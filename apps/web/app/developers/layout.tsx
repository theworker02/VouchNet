import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Developer resources | VouchNet',
  description:
    'Build consent-based hiring integrations with VouchNet: OAuth 2.0, PKCE, exact redirect URIs, and approved profile sharing.',
  alternates: { canonical: '/developers' },
};

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return <main className="developer-page">{children}</main>;
}
