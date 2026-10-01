import { symbolSize, type SymbolProps } from './shared';

export function ArchitectureNodeIcon({ size = 'md', className, ...props }: SymbolProps) {
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
      <defs>
        <marker id="arch-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0 0 5 2.5 0 5Z" fill="currentColor" />
        </marker>
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M15 16 31.5 12.5" strokeDasharray="3 3" markerEnd="url(#arch-arrow)" />
        <path d="M33 16 26 31" strokeDasharray="3 3" markerEnd="url(#arch-arrow)" />
        <path d="M20.5 34 13.5 20" strokeDasharray="3 3" markerEnd="url(#arch-arrow)" />
      </g>
      <g fill="var(--surface, white)" stroke="currentColor" strokeWidth="2">
        <circle cx="13" cy="17.5" r="5" />
        <circle cx="34" cy="13" r="5" />
        <circle cx="24" cy="34" r="5" />
      </g>
    </svg>
  );
}
