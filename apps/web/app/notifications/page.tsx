import Link from 'next/link';
import { Shell } from '../components/shell';
import { getCurrentActor } from '../lib/identity';
import { ensureDailyStrategyNotification, listMemberNotifications } from '../lib/daily-strategy';
import { NotificationInbox } from './notification-inbox';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  await ensureDailyStrategyNotification(actor.userId);
  const notifications = await listMemberNotifications(actor.userId);
  return (
    <Shell>
      <main className="notification-page">
        <header className="notification-heading">
          <p className="eyebrow">Notifications</p>
          <h1>Useful updates, not noise.</h1>
          <p>Daily games, security activity, and direct professional signals appear here.</p>
        </header>
        {notifications.length === 0 ? (
          <section className="notification-empty">
            <h2>You’re up to date.</h2>
            <p>When a new daily puzzle or other useful event is ready, it will appear here.</p>
            <Link className="secondary" href="/games">
              Play today’s puzzle
            </Link>
          </section>
        ) : (
          <NotificationInbox notifications={notifications} />
        )}
      </main>
    </Shell>
  );
}
