import { createSqlClient } from '@nexus/db';
import type { MetadataRoute } from 'next';

const siteUrl = process.env.APP_URL?.trim() || 'https://vouchnet.dev';

type SitemapRow = { slug: string; updatedAt: Date };

function entry(
  path: string,
  lastModified?: Date,
  priority?: number,
): MetadataRoute.Sitemap[number] {
  return { url: `${siteUrl}${path}`, lastModified, priority };
}

/**
 * A database outage must not make the crawl contract fail. Static public routes remain available
 * and entity URLs return on the next hourly revalidation.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicRoutes: MetadataRoute.Sitemap = [
    entry('/', undefined, 1),
    entry('/jobs', undefined, 0.9),
    entry('/discover', undefined, 0.8),
    entry('/opportunities', undefined, 0.8),
    entry('/games', undefined, 0.7),
    entry('/privacy', undefined, 0.3),
    entry('/terms', undefined, 0.3),
  ];
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined) return publicRoutes;

  const sql = createSqlClient(databaseUrl);
  try {
    const [profiles, organizations, projects, opportunities] = await Promise.all([
      sql<SitemapRow[]>`
        SELECT p.slug,p.updated_at AS "updatedAt"
        FROM profiles p JOIN users u ON u.id=p.user_id
        WHERE p.visibility='PUBLIC' AND u.status='ACTIVE'
      `,
      sql<SitemapRow[]>`
        SELECT slug,updated_at AS "updatedAt" FROM organizations WHERE deleted_at IS NULL
      `,
      sql<SitemapRow[]>`
        SELECT p.slug,p.updated_at AS "updatedAt"
        FROM projects p
        JOIN profiles pr ON pr.user_id=p.owner_id
        JOIN users u ON u.id=p.owner_id
        WHERE p.visibility='PUBLIC' AND pr.visibility='PUBLIC' AND u.status='ACTIVE'
      `,
      sql<SitemapRow[]>`
        SELECT o.slug,o.updated_at AS "updatedAt"
        FROM opportunities o
        JOIN profiles pr ON pr.user_id=o.poster_id
        JOIN users u ON u.id=o.poster_id
        WHERE o.status='OPEN' AND o.moderation_state='ACTIVE' AND pr.visibility='PUBLIC'
          AND u.status='ACTIVE' AND (o.deadline IS NULL OR o.deadline >= current_date)
      `,
    ]);
    return [
      ...publicRoutes,
      ...profiles.map((profile) => entry(`/vouch/${profile.slug}`, profile.updatedAt, 0.8)),
      ...organizations.map((organization) =>
        entry(`/company/${organization.slug}`, organization.updatedAt, 0.7),
      ),
      ...projects.map((project) => entry(`/projects/${project.slug}`, project.updatedAt, 0.7)),
      ...opportunities.map((opportunity) =>
        entry(`/opportunities/${opportunity.slug}`, opportunity.updatedAt, 0.6),
      ),
    ];
  } catch {
    return publicRoutes;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
