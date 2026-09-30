import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VouchNet',
  description: 'A professional network where humans participate and AI assists.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
