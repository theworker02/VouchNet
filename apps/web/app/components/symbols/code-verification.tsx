import { symbolSize, type SymbolProps } from './shared';

export function CodeVerificationIcon({ size = 'md', className, ...props }: SymbolProps) {
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
      <circle
        cx="24"
        cy="24"
        r="19"
        fill="none"
        stroke="currentColor"
        strokeDasharray="2 2"
        strokeWidth="2"
      />
      <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeOpacity=".36" />
      <path
        d="m16 18-4 6 4 6m8-12 4 6-4 6m-5-1h5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}
