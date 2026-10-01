import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentActor, getProfileSummary } from '../lib/identity';
import { PrimaryNavigation } from './primary-navigation';
import { AccountMenu, WorkMenu } from './shell-menus';
import { ConnectionCooldownNotice } from './connection-cooldown-notice';
import { getConnectionCooldown } from '../lib/social';
export async function Shell({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login');
  const [profile, connectionCooldown] = await Promise.all([
    getProfileSummary(actor.userId),
    getConnectionCooldown(actor.userId).catch(() => null),
  ]);
  const initials = (profile?.fullName ?? 'VouchNet member')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/home">
          VouchNet
        </Link>
        <form className="topbar-search" action="/search" role="search">
          <label className="sr-only" htmlFor="global-search">
            Search VouchNet
          </label>
          <input id="global-search" name="q" placeholder="Search people, skills, or companies" />
        </form>
        <PrimaryNavigation />
        <AccountMenu initials={initials} profileSlug={profile?.slug ?? null} />
        <WorkMenu />
      </header>
      <PrimaryNavigation mobile />
      {connectionCooldown === null ? null : (
        <ConnectionCooldownNotice resetsAt={connectionCooldown} />
      )}
      <main className="app-main">{children}</main>
    </>
  );
}
