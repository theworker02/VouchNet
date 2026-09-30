export function VerifiedWorkBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? 'verified-work-badge compact' : 'verified-work-badge'}>
      <span aria-hidden="true">✓</span>
      Verified work
    </span>
  );
}
