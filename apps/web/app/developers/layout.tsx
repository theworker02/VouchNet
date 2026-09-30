import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Developer resources | VouchNet',
  robots: { index: false, follow: false },
};

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return <main className="developer-page">{children}</main>;
}
