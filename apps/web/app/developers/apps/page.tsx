import { redirect } from 'next/navigation';

/** Kept as the public, documented location while client management stays authenticated. */
export default function DeveloperAppsPage() {
  redirect('/settings/developers/clients');
}
