import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentActor, getProfileSummary } from '../lib/identity';
import { PrimaryNavigation } from './primary-navigation';
import { AccountMenu, WorkMenu } from './shell-menus';
import { ConnectionCooldownNotice } from './connection-cooldown-notice';
import { getConnectionCooldown } from '../lib/social';
import { PageTransition } from './motion/page-transition';
import {
  ensureDailyStrategyNotification,
  unreadMemberNotificationCount,
} from '../lib/daily-strategy';
export async function Shell({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login');
  await ensureDailyStrategyNotification(actor.userId).catch(() => undefined);
  const [profile, connectionCooldown, unreadAlerts] = await Promise.all([
    getProfileSummary(actor.userId),
    getConnectionCooldown(actor.userId).catch(() => null),
    unreadMemberNotificationCount(actor.userId).catch(() => 0),
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
        <PrimaryNavigation unreadAlerts={unreadAlerts} />
        <AccountMenu initials={initials} profileSlug={profile?.slug ?? null} />
        <WorkMenu />
      </header>
      <PrimaryNavigation mobile unreadAlerts={unreadAlerts} />
      {connectionCooldown === null ? null : (
        <ConnectionCooldownNotice resetsAt={connectionCooldown} />
      )}
      <main className="app-main">
        <PageTransition>{children}</PageTransition>
      </main>
    </>
  );
}
