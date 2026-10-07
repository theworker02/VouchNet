import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Kept as the public, documented location while client management stays authenticated. */
export default function DeveloperAppsPage() {
  redirect('/settings/developers/clients');
}
