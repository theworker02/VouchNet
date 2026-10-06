import 'server-only';
import { listContributorProjects, listOwnProjects } from '../lib/projects';

/** Projects a member may link to an opportunity or a proposal: owned or actively contributed. */
export async function linkableProjects(userId: string): Promise<{ id: string; name: string }[]> {
  const [own, contributing] = await Promise.all([
    listOwnProjects(userId),
    listContributorProjects(userId),
  ]);
  return [
    ...own.map((project) => ({ id: project.id, name: project.name })),
    ...contributing
      .filter((project) => project.contributorStatus === 'ACCEPTED')
      .map((project) => ({ id: project.id, name: project.name })),
  ];
}
