'use client';

import { useReducedMotion } from 'framer-motion';

/** Shared movement is intentionally restrained so product state stays legible. */
export const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const pageTransitionTiming = {
  duration: 0.25,
  ease: [0.16, 1, 0.3, 1] as const,
};

export const tabSpring = { type: 'spring', stiffness: 500, damping: 35 } as const;

export function useMotionPreference() {
  const reducedMotion = useReducedMotion();
  return {
    reducedMotion: reducedMotion === true,
    page: reducedMotion
      ? {
          initial: false,
          animate: { opacity: 1 },
          exit: { opacity: 1 },
          transition: { duration: 0 },
        }
      : { ...pageTransition, transition: pageTransitionTiming },
    spring: reducedMotion ? { duration: 0 } : tabSpring,
    card: reducedMotion
      ? {}
      : {
          whileHover: { y: -2, transition: { duration: 0.15 } },
          whileTap: { scale: 0.98 },
        },
  };
}
