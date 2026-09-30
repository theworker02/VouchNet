import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentActor, getProfileSummary } from '../lib/identity';
import { PrimaryNavigation } from './primary-navigation';
export async function Shell({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login');
  const profile = await getProfileSummary(actor.userId);
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
        <details className="account-menu">
          <summary aria-label="Open account menu">
            <span className="nav-avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="account-label">Me</span>
          </summary>
          <div>
            <Link href={`/vouch/${profile?.slug ?? ''}`}>View profile</Link>
            <Link href="/projects">My projects</Link>
            <Link href="/saved">Saved</Link>
            <Link href="/settings">Settings</Link>
            <Link href="/settings/account">Language & display</Link>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="menu-button">
                Sign out
              </button>
            </form>
          </div>
        </details>
        <details className="work-menu">
          <summary>Work</summary>
          <div>
            <Link href="/jobs">Post a job</Link>
            <Link href="/jobs">Company tools</Link>
            <Link href="/settings/developers">Developer portal</Link>
          </div>
        </details>
      </header>
      <PrimaryNavigation mobile />
      <main className="app-main">{children}</main>
    </>
  );
}
