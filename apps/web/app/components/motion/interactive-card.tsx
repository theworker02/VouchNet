'use client';

import { motion } from 'framer-motion';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useMotionPreference } from '../../lib/motion';

export type InteractiveCardProps = ComponentPropsWithoutRef<typeof motion.article> & {
  children: ReactNode;
};

export function InteractiveCard({ children, className, ...props }: InteractiveCardProps) {
  const preference = useMotionPreference();
  return (
    <motion.article className={className} {...preference.card} {...props}>
      <span className="card-hover-shimmer" aria-hidden="true" />
      {children}
    </motion.article>
  );
}
