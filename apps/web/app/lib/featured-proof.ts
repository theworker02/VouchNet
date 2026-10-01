import { createSqlClient } from '@nexus/db';
import { requireVouchNetPlus } from './subscription';

export type FeaturedProofNode = {
  id: string;
  projectId: string | null;
  position: number;
  label: string;
  projectSlug: string | null;
  projectName: string | null;
  projectSummary: string | null;
  externalUrl: string | null;
};

function client() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

export async function listFeaturedProofNodes(userId: string): Promise<FeaturedProofNode[]> {
  const sql = client();
  try {
    return await sql<FeaturedProofNode[]>`
      SELECT n.id,n.project_id AS "projectId",n.position,n.label,p.slug AS "projectSlug",p.name AS "projectName",
        p.summary AS "projectSummary",n.external_url AS "externalUrl"
      FROM profile_featured_nodes n
      LEFT JOIN projects p ON p.id=n.project_id
      WHERE n.user_id=${userId}
      ORDER BY n.position ASC
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/** Adding or replacing a pin is server-gated; a lost entitlement never grants profile writes. */
export async function pinProjectProof(
  userId: string,
  projectId: string,
  position: number,
): Promise<FeaturedProofNode> {
  if (!Number.isInteger(position) || position < 0 || position > 2)
    throw new Error('INVALID_FEATURED_POSITION');
  await requireVouchNetPlus(userId, 'FEATURED_PROOF');
  const sql = client();
  try {
    return await sql.begin(async (transaction) => {
      const projects = await transaction<{ name: string }[]>`
        SELECT name FROM projects
        WHERE id=${projectId} AND owner_id=${userId} AND visibility='PUBLIC'
        FOR UPDATE
      `;
      const project = projects[0];
      if (project === undefined) throw new Error('PROJECT_NOT_AVAILABLE');
      const rows = await transaction<FeaturedProofNode[]>`
        INSERT INTO profile_featured_nodes (user_id,project_id,label,position)
        VALUES (${userId},${projectId},${project.name},${position})
        ON CONFLICT (user_id,position) DO UPDATE
          SET project_id=EXCLUDED.project_id,external_url=NULL,label=EXCLUDED.label,updated_at=now()
        RETURNING id,project_id AS "projectId",position,label,NULL::text AS "projectSlug",NULL::text AS "projectName",
          NULL::text AS "projectSummary",NULL::text AS "externalUrl"
      `;
      const node = rows[0];
      if (node === undefined) throw new Error('FEATURED_PROOF_WRITE_FAILED');
      return node;
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/** Removing public work remains available after a subscription ends. */
export async function removeFeaturedProof(userId: string, position: number): Promise<boolean> {
  if (!Number.isInteger(position) || position < 0 || position > 2) return false;
  const sql = client();
  try {
    const rows = await sql<{ id: string }[]>`
      DELETE FROM profile_featured_nodes WHERE user_id=${userId} AND position=${position} RETURNING id
    `;
    return rows.length === 1;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
