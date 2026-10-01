import { symbolSize, type SymbolProps } from './shared';

export function ProofOfWorkBadge({
  size = 'md',
  glowing = false,
  className,
  ...props
}: SymbolProps) {
  const dimension = symbolSize(size);
  return (
    <svg
      viewBox="0 0 48 48"
      width={dimension}
      height={dimension}
      className={className}
      aria-label="Proof of work verified"
      role="img"
      {...props}
    >
      <defs>
        <linearGradient id="pow-fill" x1="7" y1="5" x2="41" y2="43" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5B8CFF" />
          <stop offset="1" stopColor="#153A92" />
        </linearGradient>
        <filter id="pow-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="m24 3 17 9.7v19.6L24 45 7 32.3V12.7L24 3Z"
        fill="url(#pow-fill)"
        stroke="currentColor"
        strokeOpacity=".8"
        strokeWidth="1.3"
      />
      <path
        d="m24 7.6 13 7.4v15.1L24 40.4 11 30.1V15l13-7.4Z"
        fill="none"
        stroke="white"
        strokeOpacity=".45"
      />
      <g fill="none" stroke="white" strokeLinecap="round" strokeWidth="1.45" strokeOpacity=".75">
        <path d="M13 20h7l3 3h4" />
        <path d="M35 20h-7l-2 2" />
        <path d="M16 30h6l2-2" />
        <circle cx="12.5" cy="20" r="1.4" fill="white" />
        <circle cx="35.5" cy="20" r="1.4" fill="white" />
        <circle cx="15.5" cy="30" r="1.4" fill="white" />
      </g>
      <path
        d="m19 25.5 3.2 3.2L30 20.8"
        fill="none"
        stroke="#E7FFF4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
        filter={glowing ? 'url(#pow-glow)' : undefined}
      />
    </svg>
  );
}
