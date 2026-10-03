import { getDailyStrategyGame } from './daily-strategy-game';

export type CuratedDiscoveryJob = {
  slug: string;
  title: string;
  organizationName: string;
  organizationSlug: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  skillTags: string[];
};

export type CuratedDiscoveryOrganization = {
  slug: string;
  name: string;
  tagline: string | null;
  technologies: string[];
  openRoleCount: number;
};

export type FeedDiscovery = {
  jobs: CuratedDiscoveryJob[];
  organizations: CuratedDiscoveryOrganization[];
  topics: string[];
  dailyChallenge: {
    title: string;
    difficultyLabel: string;
    moveBudget: number;
  };
};

export function buildFeedDiscovery(
  jobs: readonly CuratedDiscoveryJob[],
  organizations: readonly CuratedDiscoveryOrganization[],
  date = new Date(),
): FeedDiscovery {
  const dailyChallenge = getDailyStrategyGame(date.toISOString().slice(0, 10));
  return {
    jobs: [...jobs].slice(0, 3),
    organizations: [...organizations].slice(0, 3),
    topics: Array.from(new Set(jobs.flatMap((job) => job.skillTags))).slice(0, 4),
    dailyChallenge: {
      title: dailyChallenge.title,
      difficultyLabel: dailyChallenge.difficultyLabel,
      moveBudget: dailyChallenge.moveBudget,
    },
  };
}
