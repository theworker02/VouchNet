import { createSqlClient } from '@nexus/db';

export interface PersonCard {
  userId: string;
  slug: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  location: string | null;
}

function sql() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

/** Initial PostgreSQL search adapter. The @nexus/search contract keeps this UI independent
 * from the future full-text/OpenSearch implementation. */
export async function searchPeople(viewerId: string, query: string): Promise<PersonCard[]> {
  if (query.length < 2) return [];
  const client = sql();
  try {
    const pattern = `%${query}%`;
    return await client<PersonCard[]>`
      SELECT p.user_id AS "userId",p.slug,p.first_name AS "firstName",p.last_name AS "lastName",
             p.headline,p.location
      FROM profiles p
      WHERE (p.visibility IN ('PUBLIC','MEMBERS') OR p.user_id=${viewerId})
        AND (p.first_name ILIKE ${pattern}
          OR p.last_name ILIKE ${pattern}
          OR COALESCE(p.headline,'') ILIKE ${pattern}
          OR COALESCE(p.location,'') ILIKE ${pattern})
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id=${viewerId} AND b.blocked_id=p.user_id)
             OR (b.blocker_id=p.user_id AND b.blocked_id=${viewerId})
        )
      ORDER BY p.first_name ASC,p.last_name ASC
      LIMIT 25
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function getVisibleProfile(
  viewerId: string | null,
  slug: string,
): Promise<
  | (PersonCard & {
      about: string | null;
      visibility: string;
    })
  | null
> {
  const client = sql();
  try {
    const rows = await client<(PersonCard & { about: string | null; visibility: string })[]>`
      SELECT p.user_id AS "userId",p.slug,p.first_name AS "firstName",p.last_name AS "lastName",
             p.headline,p.location,p.about,p.visibility
      FROM profiles p
      WHERE p.slug=${slug}
        AND (p.visibility='PUBLIC' OR p.user_id=${viewerId})
        AND (${viewerId}::uuid IS NULL OR NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id=${viewerId} AND b.blocked_id=p.user_id)
             OR (b.blocker_id=p.user_id AND b.blocked_id=${viewerId})
        ))
    `;
    return rows[0] ?? null;
  } finally {
    await client.end({ timeout: 1 });
  }
}
