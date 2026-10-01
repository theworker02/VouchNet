import { symbolSize, type SymbolProps } from './shared';

export function SignalPulseIcon({ size = 'md', className, ...props }: SymbolProps) {
  const dimension = symbolSize(size);
  return (
    <svg
      viewBox="0 0 48 48"
      width={dimension}
      height={dimension}
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="24" cy="24" r="3.4" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2">
        <path d="M16.8 31.2a10.2 10.2 0 0 1 0-14.4" />
        <path d="M31.2 16.8a10.2 10.2 0 0 1 0 14.4" opacity=".85" />
        <path d="M11.6 36.4a17 17 0 0 1 0-24.8" opacity=".55" />
        <path d="M36.4 11.6a17 17 0 0 1 0 24.8" opacity=".55" />
      </g>
    </svg>
  );
}
