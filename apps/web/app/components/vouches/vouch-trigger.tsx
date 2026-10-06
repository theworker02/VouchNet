'use client';

import { motion } from 'framer-motion';
import { buttonClassName } from '../ui/button';
import { useVouchBoard } from './vouch-board';
import { VouchMark } from './vouch-mark';

/** The Vouch button; it morphs into the Vouch Console through a shared layout id. */
export function VouchTrigger({
  origin,
  variant = 'secondary',
  appearance = 'app',
  label,
}: {
  origin: string;
  variant?: 'primary' | 'secondary';
  /** `instrument` is used inside vouch surfaces; `app` matches the surrounding product UI. */
  appearance?: 'app' | 'instrument';
  label?: string;
}) {
  const { composer, consoleOrigin, openConsole, recipient } = useVouchBoard();
  if (composer === null) return null;
  const text = label ?? (composer.existing === null ? 'Vouch' : 'Edit your vouch');
  const open = consoleOrigin === origin;
  return (
    <motion.button
      {...(open ? {} : { layoutId: origin })}
      type="button"
      className={
        appearance === 'instrument'
          ? 'instrument-primary vouch-trigger'
          : buttonClassName({ variant, size: 'md', className: 'vouch-trigger' })
      }
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`${text} for ${recipient.name}`}
      style={{ visibility: open ? 'hidden' : 'visible' }}
      onClick={() => openConsole(origin)}
    >
      <VouchMark size={16} />
      <span>{text}</span>
    </motion.button>
  );
}
