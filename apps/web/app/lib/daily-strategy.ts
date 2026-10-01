import { createSqlClient } from '@nexus/db';
import { getDailyStrategyGame, isSuccessfulDailyStrategyRun } from './daily-strategy-game';

export { getDailyStrategyGame, isSuccessfulDailyStrategyRun } from './daily-strategy-game';
export type { DailyStrategyGame } from './daily-strategy-game';

export type DailyStrategyProgress = {
  completedAt: Date;
  moveCount: number;
  elapsedMs: number;
} | null;

export type MemberNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  readAt: Date | null;
  createdAt: Date;
};

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (value === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return value;
}

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function getDailyStrategyProgress(
  userId: string,
  date = dayKey(),
): Promise<DailyStrategyProgress> {
  const sql = createSqlClient(databaseUrl());
  try {
    const rows = await sql<{ completed_at: Date; move_count: number; elapsed_ms: number }[]>`
      SELECT completed_at,move_count,elapsed_ms
      FROM daily_strategy_runs
      WHERE user_id=${userId} AND game_date=${date}
      LIMIT 1
    `;
    const run = rows[0];
    return run === undefined
      ? null
      : { completedAt: run.completed_at, moveCount: run.move_count, elapsedMs: run.elapsed_ms };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function completeDailyStrategyRun(input: {
  userId: string;
  date: string;
  moves: number[];
  elapsedMs: number;
}): Promise<DailyStrategyProgress | null> {
  // A client may never pre-complete a future board or backfill historical streaks.
  if (input.date !== dayKey()) return null;
  const game = getDailyStrategyGame(input.date);
  if (!isSuccessfulDailyStrategyRun(game, input.moves)) return null;
  const sql = createSqlClient(databaseUrl());
  const elapsedMs = Math.min(Math.max(Math.floor(input.elapsedMs), 0), 1_800_000);
  try {
    const rows = await sql<{ completed_at: Date; move_count: number; elapsed_ms: number }[]>`
      INSERT INTO daily_strategy_runs (user_id,game_date,difficulty,move_count,elapsed_ms)
      VALUES (${input.userId},${game.date},${game.difficulty},${input.moves.length},${elapsedMs})
      ON CONFLICT (user_id,game_date) DO UPDATE
        SET move_count=LEAST(daily_strategy_runs.move_count,EXCLUDED.move_count),
            elapsed_ms=LEAST(daily_strategy_runs.elapsed_ms,EXCLUDED.elapsed_ms),
            updated_at=now()
      RETURNING completed_at,move_count,elapsed_ms
    `;
    const run = rows[0];
    if (run === undefined) throw new Error('DAILY_GAME_COMPLETION_FAILED');
    await sql`
      UPDATE member_notifications SET read_at=COALESCE(read_at,now())
      WHERE user_id=${input.userId} AND category='DAILY_GAME' AND resource_key=${game.date}
    `;
    return { completedAt: run.completed_at, moveCount: run.move_count, elapsedMs: run.elapsed_ms };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/** Materialized on a signed-in request so no background worker impersonates a member. */
export async function ensureDailyStrategyNotification(
  userId: string,
  date = dayKey(),
): Promise<void> {
  const game = getDailyStrategyGame(date);
  const sql = createSqlClient(databaseUrl());
  try {
    await sql`
      INSERT INTO member_notifications (user_id,category,resource_key,title,body,href)
      VALUES (
        ${userId},
        'DAILY_GAME',
        ${game.date},
        ${`${game.title} is ready`},
        ${`${game.difficultyLabel} difficulty · solve the signal grid in ${game.moveBudget} moves or fewer.`},
        '/games'
      )
      ON CONFLICT (user_id,category,resource_key) DO NOTHING
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function listMemberNotifications(userId: string): Promise<MemberNotification[]> {
  const sql = createSqlClient(databaseUrl());
  try {
    return await sql<MemberNotification[]>`
      SELECT id,title,body,href,read_at AS "readAt",created_at AS "createdAt"
      FROM member_notifications
      WHERE user_id=${userId}
      ORDER BY read_at NULLS FIRST,created_at DESC
      LIMIT 50
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function unreadMemberNotificationCount(userId: string): Promise<number> {
  const sql = createSqlClient(databaseUrl());
  try {
    const rows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::integer AS count FROM member_notifications
      WHERE user_id=${userId} AND read_at IS NULL
    `;
    return rows[0]?.count ?? 0;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/**
 * The application shell needs the current badge count on every authenticated navigation. Keep the
 * once-per-day materialization and the count on one connection so the navigation does not wait on
 * two sequential database lifecycles.
 */
export async function syncDailyStrategyNotificationAndGetUnreadCount(
  userId: string,
): Promise<number> {
  const game = getDailyStrategyGame(dayKey());
  const sql = createSqlClient(databaseUrl());
  try {
    await sql`
      INSERT INTO member_notifications (user_id,category,resource_key,title,body,href)
      VALUES (
        ${userId},
        'DAILY_GAME',
        ${game.date},
        ${`${game.title} is ready`},
        ${`${game.difficultyLabel} difficulty · solve the signal grid in ${game.moveBudget} moves or fewer.`},
        '/games'
      )
      ON CONFLICT (user_id,category,resource_key) DO NOTHING
    `;
    const rows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::integer AS count
      FROM member_notifications
      WHERE user_id=${userId} AND read_at IS NULL
    `;
    return rows[0]?.count ?? 0;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function markMemberNotificationRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const sql = createSqlClient(databaseUrl());
  try {
    const rows = await sql<{ id: string }[]>`
      UPDATE member_notifications SET read_at=COALESCE(read_at,now())
      WHERE id=${notificationId} AND user_id=${userId}
      RETURNING id
    `;
    return rows.length === 1;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
