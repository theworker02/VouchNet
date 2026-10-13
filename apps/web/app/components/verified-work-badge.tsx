import { Badge } from './ui/badge';

export function VerifiedWorkBadge({ compact = false }: { compact?: boolean }) {
  return (
    <Badge
      className={compact ? 'verified-work-badge compact' : 'verified-work-badge'}
      tone="positive"
    >
      <span aria-hidden="true">✓</span>
      Verified work
    </Badge>
  );
}
