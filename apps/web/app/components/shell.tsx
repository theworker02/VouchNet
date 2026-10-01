import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentActor, getProfileSummary } from '../lib/identity';
import { PrimaryNavigation } from './primary-navigation';
import { AccountMenu, WorkMenu } from './shell-menus';
import { ConnectionCooldownNotice } from './connection-cooldown-notice';
import { getConnectionCooldown } from '../lib/social';
import { PageTransition } from './motion/page-transition';
import { VouchNetLogo } from './brand';
import { syncDailyStrategyNotificationAndGetUnreadCount } from '../lib/daily-strategy';
export async function Shell({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login');
  const [profile, connectionCooldown, unreadAlerts] = await Promise.all([
    getProfileSummary(actor.userId),
    getConnectionCooldown(actor.userId).catch(() => null),
    syncDailyStrategyNotificationAndGetUnreadCount(actor.userId).catch(() => 0),
  ]);
  const initials = (profile?.fullName ?? 'VouchNet member')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <>
      <a className="skip-navigation" href="#main-content">
        Skip to main content
      </a>
      <header className="topbar">
        <Link className="brand" href="/home">
          <VouchNetLogo className="topbar-brand-logo" />
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
      <main className="app-main" id="main-content" tabIndex={-1}>
        <PageTransition>{children}</PageTransition>
      </main>
    </>
  );
}
