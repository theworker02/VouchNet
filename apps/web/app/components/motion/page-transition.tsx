'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useMotionPreference } from '../../lib/motion';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const preference = useMotionPreference();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={pathname} {...preference.page}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
