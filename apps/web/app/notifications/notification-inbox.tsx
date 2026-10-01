'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemberNotification } from '../lib/daily-strategy';

export function NotificationInbox({ notifications }: { notifications: MemberNotification[] }) {
  const [items, setItems] = useState(notifications);
  const router = useRouter();
  async function markRead(id: string): Promise<boolean> {
    const original = items.find((notification) => notification.id === id);
    if (original === undefined || original.readAt !== null) return true;
    setItems((current) =>
      current.map((notification) =>
        notification.id === id && notification.readAt === null
          ? { ...notification, readAt: new Date() }
          : notification,
      ),
    );
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (!response.ok) throw new Error('NOTIFICATION_READ_FAILED');
      return true;
    } catch {
      setItems((current) =>
        current.map((notification) => (notification.id === id ? original : notification)),
      );
      return false;
    }
  }
  async function openNotification(notification: MemberNotification) {
    await markRead(notification.id);
    router.push(notification.href);
  }
  return (
    <section className="notification-inbox" aria-label="Your notifications">
      {items.map((notification) => (
        <article
          className={
            notification.readAt === null ? 'notification-item is-unread' : 'notification-item'
          }
          key={notification.id}
        >
          <span aria-hidden="true" className="notification-item-mark">
            ⌁
          </span>
          <div>
            <h2>{notification.title}</h2>
            <p>{notification.body}</p>
            <time dateTime={new Date(notification.createdAt).toISOString()}>
              {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                new Date(notification.createdAt),
              )}
            </time>
          </div>
          <Link
            href={notification.href}
            onClick={(event) => {
              event.preventDefault();
              void openNotification(notification);
            }}
          >
            Open
          </Link>
        </article>
      ))}
    </section>
  );
}
