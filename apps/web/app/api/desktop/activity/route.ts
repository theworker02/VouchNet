import { NextRequest, NextResponse } from 'next/server';
import { desktopActorFromBearer } from '../../../lib/desktop-auth';
import {
  ensureDailyStrategyNotification,
  listMemberNotifications,
} from '../../../lib/daily-strategy';

/**
 * Desktop activity uses a device Bearer token. Keep it separate from the cookie-backed
 * notifications page so the Tauri client never has to impersonate a browser session.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    await ensureDailyStrategyNotification(actor.userId);
    const notifications = await listMemberNotifications(actor.userId);
    return NextResponse.json({
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        href: notification.href,
        readAt: notification.readAt === null ? null : notification.readAt.toISOString(),
        createdAt: notification.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: 'ACTIVITY_UNAVAILABLE' }, { status: 503 });
  }
}
