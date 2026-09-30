import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentActor, getProfileSummary } from '../lib/identity';

const links: readonly [string, string, string][] = [
  ['⌂', 'Home', '/feed'],
  ['◌', 'My Network', '/mynetwork'],
  ['▣', 'Jobs', '/jobs'],
  ['✉', 'Messaging', '/messaging'],
  ['♧', 'Notifications', '/notifications'],
];
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
        <form className="topbar-search" action="/search">
          <label className="sr-only" htmlFor="global-search">
            Search VouchNet
          </label>
          <input id="global-search" name="q" placeholder="Search VouchNet" />
        </form>
        <nav aria-label="Primary navigation">
          {links.map(([icon, label, href]) => (
            <Link key={href} href={href}>
              <span aria-hidden="true">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <details className="account-menu">
          <summary aria-label="Open account menu">
            <span className="nav-avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="account-label">Me</span>
          </summary>
          <div>
            <Link href={`/in/${profile?.slug ?? ''}`}>View profile</Link>
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
            <Link href="/settings/data">Developer portal</Link>
          </div>
        </details>
      </header>
      <main className="app-main">{children}</main>
    </>
  );
}
