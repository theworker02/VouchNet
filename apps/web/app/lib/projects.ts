import { createSqlClient } from '@nexus/db';

export type ProjectRecord = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  status: string;
  projectUrl: string | null;
  repositoryUrl: string | null;
  documentationUrl: string | null;
  demoUrl: string | null;
  ongoing: boolean;
  ownerName: string;
  ownerSlug: string;
  tags: string[];
};

function sql() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}

export async function listOwnProjects(ownerId: string): Promise<ProjectRecord[]> {
  const client = sql();
  try {
    return await client<ProjectRecord[]>`
      SELECT p.id,p.slug,p.name,p.summary,p.description,p.status,p.project_url AS "projectUrl",
        p.repository_url AS "repositoryUrl",p.documentation_url AS "documentationUrl",
        p.demo_url AS "demoUrl",p.ongoing,
        pr.first_name || ' ' || pr.last_name AS "ownerName",pr.slug AS "ownerSlug",
        COALESCE(array_agg(pt.tag) FILTER (WHERE pt.tag IS NOT NULL), '{}') AS tags
      FROM projects p
      JOIN profiles pr ON pr.user_id=p.owner_id
      LEFT JOIN project_tags pt ON pt.project_id=p.id
      WHERE p.owner_id=${ownerId} AND p.visibility='PUBLIC'
      GROUP BY p.id,pr.first_name,pr.last_name,pr.slug
      ORDER BY p.updated_at DESC
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function getPublicProject(slug: string): Promise<ProjectRecord | null> {
  const client = sql();
  try {
    const rows = await client<ProjectRecord[]>`
      SELECT p.id,p.slug,p.name,p.summary,p.description,p.status,p.project_url AS "projectUrl",
        p.repository_url AS "repositoryUrl",p.documentation_url AS "documentationUrl",
        p.demo_url AS "demoUrl",p.ongoing,
        pr.first_name || ' ' || pr.last_name AS "ownerName",pr.slug AS "ownerSlug",
        COALESCE(array_agg(pt.tag) FILTER (WHERE pt.tag IS NOT NULL), '{}') AS tags
      FROM projects p
      JOIN profiles pr ON pr.user_id=p.owner_id
      JOIN users u ON u.id=p.owner_id AND u.status='ACTIVE'
      LEFT JOIN project_tags pt ON pt.project_id=p.id
      WHERE p.slug=${slug} AND p.visibility='PUBLIC' AND pr.visibility='PUBLIC'
      GROUP BY p.id,pr.first_name,pr.last_name,pr.slug
    `;
    return rows[0] ?? null;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function createProject(
  ownerId: string,
  input: {
    name: string;
    summary: string;
    description: string;
    status: 'IDEA' | 'ACTIVE' | 'SHIPPED' | 'ARCHIVED';
    projectUrl?: string | undefined;
    repositoryUrl?: string | undefined;
    documentationUrl?: string | undefined;
    demoUrl?: string | undefined;
    tags: string[];
  },
): Promise<{ slug: string }> {
  const client = sql();
  const base = makeSlug(input.name);
  const slug = `${base}-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await client.begin(async (transaction) => {
      const rows = await transaction<{ id: string }[]>`
        INSERT INTO projects (owner_id,slug,name,summary,description,status,project_url,repository_url,documentation_url,demo_url)
        VALUES (${ownerId},${slug},${input.name},${input.summary},${input.description},${input.status},
          ${input.projectUrl ?? null},${input.repositoryUrl ?? null},${input.documentationUrl ?? null},${input.demoUrl ?? null})
        RETURNING id
      `;
      const project = rows[0];
      if (project === undefined) throw new Error('PROJECT_CREATION_FAILED');
      for (const tag of input.tags) {
        await transaction`INSERT INTO project_tags (project_id,tag) VALUES (${project.id},${tag})`;
      }
    });
    return { slug };
  } finally {
    await client.end({ timeout: 1 });
  }
}
