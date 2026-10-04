/**
 * Portable, implementation-neutral vocabulary for VouchNet interfaces.
 *
 * CSS remains owned by each client for now, but the naming and measurement contract lives here so
 * a future desktop client or standalone design-system package can share the same intent.
 */
export const vouchNetDesignLanguage = {
  color: {
    accent: 'blue',
    success: 'emerald',
    warning: 'amber',
    surface: 'neutral',
  },
  control: {
    heights: { compact: 34, standard: 40, prominent: 46 },
    radius: 12,
  },
  surface: {
    radius: 14,
    elevation: ['flat', 'raised', 'floating'] as const,
  },
  motion: {
    quick: 150,
    page: 250,
    reducedMotion: 'instant',
  },
} as const;

/** @deprecated Use `vouchNetDesignLanguage` in new client surfaces. */
export const nexusDesignTokens = { accent: 'indigo', radius: '0.75rem' } as const;

export function classNames(...values: Array<string | undefined | false | null>): string {
  return values
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ');
}
