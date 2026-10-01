'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { MemberNotification } from '../lib/daily-strategy';

export function NotificationInbox({ notifications }: { notifications: MemberNotification[] }) {
  const [items, setItems] = useState(notifications);
  async function markRead(id: string) {
    setItems((current) =>
      current.map((notification) =>
        notification.id === id && notification.readAt === null
          ? { ...notification, readAt: new Date() }
          : notification,
      ),
    );
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => undefined);
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
          <Link href={notification.href} onClick={() => void markRead(notification.id)}>
            Open
          </Link>
        </article>
      ))}
    </section>
  );
}
