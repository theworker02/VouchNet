import { symbolSize, type SymbolProps } from './shared';

export function EmeraldVouchBadge({
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
      aria-label="VouchNet+ verified"
      role="img"
      {...props}
    >
      <defs>
        <radialGradient id="emerald-core">
          <stop stopColor="#A7F3D0" />
          <stop offset=".55" stopColor="#16A879" />
          <stop offset="1" stopColor="#075943" />
        </radialGradient>
        <filter id="emerald-glow">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx="24"
        cy="24"
        r="21"
        fill="url(#emerald-core)"
        filter={glowing ? 'url(#emerald-glow)' : undefined}
      />
      <circle cx="24" cy="24" r="18" fill="none" stroke="#D8FFF0" strokeOpacity=".8" />
      <circle cx="24" cy="24" r="15" fill="none" stroke="#062E26" strokeOpacity=".38" />
      <path d="m13 16 8.6 18h4.8L35 16h-5.4L24 28.5 18.4 16H13Z" fill="white" fillOpacity=".97" />
    </svg>
  );
}
