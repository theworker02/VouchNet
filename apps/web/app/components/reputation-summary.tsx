import { reputationConfig } from '../lib/reputation-config';
import type { Reputation } from '../lib/reputation-model';

const actionLabels: Record<keyof typeof reputationConfig.actionPoints, string> = {
  POST: 'Posts',
  COMMENT: 'Comments',
  REPLY: 'Replies',
  BUILD_LOG: 'Build-log entries',
};

/**
 * Reputation from participation, with a plain-language explainer. Vouches only add a small,
 * capped bonus on top of real activity; they are never shown as a trust score.
 */
export function ReputationSummary({
  reputation,
  isOwner,
}: {
  reputation: Reputation;
  isOwner: boolean;
}) {
  const bonusPercent = Math.round(reputation.vouchBonus * 1000) / 10;
  const maxBonus = Math.round(reputationConfig.vouchBonus.maxBonus * 100);
  return (
    <section className="profile-section reputation-summary" aria-labelledby="reputation-heading">
      <h2 id="reputation-heading">Reputation</h2>
      <p className="reputation-line">
        <strong>{reputation.level}</strong>
        <span>
          {reputation.score} reputation from participation
          {reputation.nextLevelAt === null ? '' : ` · next level at ${reputation.nextLevelAt}`}
        </span>
      </p>
      <div
        className="project-tags reputation-breakdown"
        aria-label="Participation in the last year"
      >
        {(Object.keys(actionLabels) as (keyof typeof actionLabels)[]).map((type) => (
          <span key={type}>
            {actionLabels[type]}: {reputation.breakdown[type].count}
          </span>
        ))}
        {bonusPercent > 0 ? <span>Vouch bonus: +{bonusPercent}%</span> : null}
      </div>
      <details className="project-links reputation-explainer">
        <summary>How this is calculated</summary>
        <div>
          <p>
            Reputation = participation points × (1 + vouch bonus). It reflects what{' '}
            {isOwner ? 'you have' : 'this member has'} contributed over the last{' '}
            {reputationConfig.windowDays} days, not how trustworthy anyone is.
          </p>
          <p>
            Points per action: posts {reputationConfig.actionPoints.POST}, build-log entries{' '}
            {reputationConfig.actionPoints.BUILD_LOG}, comments{' '}
            {reputationConfig.actionPoints.COMMENT}, replies {reputationConfig.actionPoints.REPLY}.
            Each day has a cap per action (posts {reputationConfig.dailyCaps.POST}, build logs{' '}
            {reputationConfig.dailyCaps.BUILD_LOG}, comments {reputationConfig.dailyCaps.COMMENT},
            replies {reputationConfig.dailyCaps.REPLY}), repeated actions on the same day are worth
            progressively less, and rapid repeats within {reputationConfig.rapidRepeatSeconds}{' '}
            seconds count for a quarter.
          </p>
          <p>
            Comments on your own posts earn nothing. Deleted content, and content removed by a human
            moderator, stops counting immediately.
          </p>
          <p>
            Vouches add at most {maxBonus}% with diminishing returns. A vouch counts more when its
            author actively participates, when the relationship is direct, and when VouchNet can
            verify shared context. Mutual vouches written close together count for less.
          </p>
        </div>
      </details>
    </section>
  );
}
