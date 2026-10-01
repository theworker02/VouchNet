import { symbolSize, type SymbolProps } from './shared';

export function ColdMessageGateIcon({ size = 'md', className, ...props }: SymbolProps) {
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
      <path
        d="M24 5 38 11v11c0 9.5-5.7 16-14 20-8.3-4-14-10.5-14-20V11l14-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M20.2 22a3.8 3.8 0 1 1 6.6 2.6v5.1h-5.6v-5.1a3.8 3.8 0 0 1-1-2.6Z"
        fill="currentColor"
      />
      <path
        d="M7 15H3v18h4m30-18h8v18h-8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <text x="7" y="28" fill="currentColor" fontFamily="ui-monospace, monospace" fontSize="8">
        $
      </text>
    </svg>
  );
}
