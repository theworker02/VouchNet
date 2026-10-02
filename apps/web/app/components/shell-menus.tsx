'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMotionPreference } from '../lib/motion';

type ShellMenuProps = {
  children: ReactNode;
  label: string;
  trigger: ReactNode;
  wide?: boolean;
};

function ShellMenu({ children, label, trigger, wide = false }: ShellMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const motionPreference = useMotionPreference();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target))
        setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('pointerdown', closeOnOutsidePointer);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePointer);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className={wide ? 'shell-menu shell-menu--wide' : 'shell-menu'} ref={menuRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="shell-menu-trigger"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {trigger}
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            aria-label={label}
            className="shell-menu-popover"
            id={menuId}
            role="menu"
            initial={motionPreference.reducedMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              motionPreference.reducedMotion ? { opacity: 1 } : { opacity: 0, y: -4, scale: 0.98 }
            }
            transition={
              motionPreference.reducedMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }
            }
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function AccountMenu({
  initials,
  profileSlug,
}: {
  initials: string;
  profileSlug: string | null;
}) {
  return (
    <ShellMenu
      label="Account menu"
      trigger={
        <>
          <span className="nav-avatar" aria-hidden="true">
            {initials}
          </span>
          <span className="shell-menu-label">Me</span>
        </>
      }
    >
      <div className="shell-menu-heading">
        <strong>Account</strong>
        <span>Profile and preferences</span>
      </div>
      <div className="shell-menu-links">
        <Link href={profileSlug === null ? '/onboarding' : `/vouch/${profileSlug}`} role="menuitem">
          View profile
        </Link>
        <Link href="/saved" role="menuitem">
          Saved items
        </Link>
        <Link href="/settings" role="menuitem">
          Settings &amp; privacy
        </Link>
        <Link href="/settings/account" role="menuitem">
          Display &amp; language
        </Link>
      </div>
      <form action="/api/auth/logout" method="post">
        <button className="shell-menu-signout" role="menuitem" type="submit">
          Sign out
        </button>
      </form>
    </ShellMenu>
  );
}

export function WorkMenu() {
  return (
    <ShellMenu
      label="Work menu"
      wide
      trigger={
        <>
          <span className="shell-menu-work-mark" aria-hidden="true">
            ⌘
          </span>
          <span className="shell-menu-label">Work</span>
        </>
      }
    >
      <div className="shell-menu-heading">
        <strong>Build professional momentum</strong>
        <span>Tools for finding, sharing, and applying.</span>
      </div>
      <div className="shell-menu-links shell-menu-links--tiles">
        <Link href="/jobs" role="menuitem">
          <strong>Browse jobs</strong>
          <span>Transparent roles and compensation</span>
        </Link>
        <Link href="/jobs/tracker" role="menuitem">
          <strong>Application Radar</strong>
          <span>Track VouchNet-native applications</span>
        </Link>
        <Link href="/jobs/post" role="menuitem">
          <strong>Employer workspace</strong>
          <span>Submit roles and manage candidates</span>
        </Link>
        <Link href="/projects" role="menuitem">
          <strong>Showcase projects</strong>
          <span>Bring meaningful work forward</span>
        </Link>
        <Link href="/games" role="menuitem">
          <strong>Daily strategy game</strong>
          <span>One original signal puzzle every day</span>
        </Link>
        <Link href="/network/discover" role="menuitem">
          <strong>Find people</strong>
          <span>Discover relevant collaborators</span>
        </Link>
        <Link href="/developers" role="menuitem">
          <strong>Developer portal</strong>
          <span>Apply with VouchNet integrations</span>
        </Link>
        <Link href="/moderation" role="menuitem">
          <strong>Volunteer moderation</strong>
          <span>Help shape accountable community safety</span>
        </Link>
      </div>
      <div className="shell-menu-support" aria-label="Project support">
        <a
          href="https://github.com/theworker02/VouchNet/issues/new?template=bug_report.yml"
          rel="noreferrer"
          role="menuitem"
          target="_blank"
        >
          Submit an issue
        </a>
        <a
          href="https://github.com/theworker02/VouchNet/issues/new?template=feature_request.yml"
          rel="noreferrer"
          role="menuitem"
          target="_blank"
        >
          Request a feature
        </a>
        <a
          href="https://github.com/theworker02/VouchNet"
          rel="noreferrer"
          role="menuitem"
          target="_blank"
        >
          View repository
        </a>
      </div>
    </ShellMenu>
  );
}
