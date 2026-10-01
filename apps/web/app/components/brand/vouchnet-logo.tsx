import type { SVGProps } from 'react';

type MarkSize = 'sm' | 'md' | 'lg';

const markDimensions: Record<MarkSize, number> = { sm: 20, md: 30, lg: 44 };

export function VouchNetSymbol({
  size = 'md',
  title,
  ...props
}: SVGProps<SVGSVGElement> & { size?: MarkSize; title?: string }) {
  const dimension = markDimensions[size];
  return (
    <svg
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
      height={dimension}
      role={title === undefined ? undefined : 'img'}
      viewBox="0 0 32 32"
      width={dimension}
      {...props}
    >
      {title === undefined ? null : <title>{title}</title>}
      <rect width="32" height="32" rx="9" fill="#2457d6" />
      <path d="M7.25 8.2h5.1L16 19.35 19.65 8.2h5.1L17.55 24h-3.1L7.25 8.2Z" fill="#fff" />
      <path
        d="m10.3 8.2 5.7 11.15L21.7 8.2h3.05L17.55 24h-3.1L7.25 8.2h3.05Z"
        fill="#bcd0ff"
        opacity=".65"
      />
    </svg>
  );
}

export function VouchNetLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={className}>
      <VouchNetSymbol size="md" />
      {compact ? null : <span>VouchNet</span>}
    </span>
  );
}

export function VouchPlusBadge({ className }: { className?: string }) {
  return (
    <span className={className} aria-label="VouchNet Plus">
      <VouchNetSymbol size="sm" />
      <span>+</span>
    </span>
  );
}
