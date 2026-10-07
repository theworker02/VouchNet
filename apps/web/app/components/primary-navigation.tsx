'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { useMotionPreference } from '../lib/motion';

const navigation = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/mynetwork', label: 'Network', icon: 'network' },
  { href: '/discover', label: 'Discover', icon: 'compass' },
  { href: '/jobs', label: 'Jobs', icon: 'briefcase' },
  { href: '/messaging', label: 'Messages', icon: 'message' },
  { href: '/notifications', label: 'Alerts', icon: 'bell' },
  { href: '/games', label: 'Games', icon: 'game' },
] as const;

type IconName = (typeof navigation)[number]['icon'];

function NavigationIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Zm6 11v-6h6v6" />,
    network: (
      <>
        <circle cx="8" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M2.8 20c.8-3.1 2.7-4.7 5.2-4.7s4.4 1.6 5.2 4.7M14.1 18.8c.5-1.9 1.7-2.9 3.5-2.9 1.8 0 3 .9 3.6 2.8" />
      </>
    ),
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
      </>
    ),
    briefcase: (
      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7m4 0H4a2 2 0 0 0-2 2v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9a2 2 0 0 0-2-2ZM2 12h20m-12 0v2h4v-2" />
    ),
    message: (
      <path d="M20 15a3 3 0 0 1-3 3H9l-5 3v-3a3 3 0 0 1-2-3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9Z" />
    ),
    bell: <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4" />,
    game: (
      <path d="M6 12h4m-2-2v4m7-4h.01M18 12h.01M7.5 6h9a4.5 4.5 0 0 1 4.4 5.4l-1 5a3.2 3.2 0 0 1-5.5 1.6L13 16.6h-2l-1.4 1.4a3.2 3.2 0 0 1-5.5-1.6l-1-5A4.5 4.5 0 0 1 7.5 6Z" />
    ),
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      {paths[name]}
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (href === '/mynetwork' && pathname.startsWith('/network')) ||
    (href === '/games' && pathname.startsWith('/games'))
  );
}

export function PrimaryNavigation({
  mobile = false,
  unreadAlerts = 0,
}: {
  mobile?: boolean;
  unreadAlerts?: number;
}) {
  const pathname = usePathname();
  const preference = useMotionPreference();
  return (
    <LayoutGroup id={mobile ? 'mobile-navigation' : 'desktop-navigation'}>
      <nav className={mobile ? 'mobile-nav' : 'primary-nav'} aria-label="Primary navigation">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            className={isActive(pathname, item.href) ? 'is-active' : undefined}
          >
            {isActive(pathname, item.href) ? (
              <motion.span
                aria-hidden="true"
                className="nav-active-indicator"
                layoutId="active-tab-indicator"
                transition={preference.spring}
              />
            ) : null}
            <NavigationIcon name={item.icon} />
            <span>{item.label}</span>
            {item.href === '/notifications' && unreadAlerts > 0 ? (
              <span className="nav-notification-count" aria-label={`${unreadAlerts} unread alerts`}>
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
    </LayoutGroup>
  );
}
