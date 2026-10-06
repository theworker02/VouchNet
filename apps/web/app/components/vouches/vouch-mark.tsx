/** The VouchNet "V" instrument mark. Decorative unless a label is supplied. */
export function VouchMark({
  size = 28,
  label,
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      className={className ?? 'vouch-mark'}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={label === undefined ? undefined : 'img'}
      aria-hidden={label === undefined ? true : undefined}
      aria-label={label}
      focusable="false"
    >
      <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeOpacity="0.28" />
      <circle cx="16" cy="16" r="11.5" fill="none" stroke="currentColor" strokeOpacity="0.12" />
      <path
        d="M9.5 10.5 16 22l6.5-11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
