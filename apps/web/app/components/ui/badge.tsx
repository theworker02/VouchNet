import type { HTMLAttributes, ReactNode } from 'react';
import { classNames } from '@nexus/ui';

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'warning' | 'critical';

/**
 * Compact, semantic metadata treatment for state, verification, and technical labels.
 * The shared tone contract prevents each surface from inventing a new status colour.
 */
export function Badge({
  children,
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span {...props} className={classNames('vn-badge', `vn-badge--${tone}`, className)}>
      {children}
    </span>
  );
}
