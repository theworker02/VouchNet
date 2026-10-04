import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from '@nexus/ui';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonStyleOptions = {
  className?: string | undefined;
  size?: ButtonSize | undefined;
  variant?: ButtonVariant | undefined;
};

/** Shared control measurements keep actions consistent across public and authenticated surfaces. */
export function buttonClassName({
  className,
  size = 'md',
  variant = 'primary',
}: ButtonStyleOptions = {}): string {
  return classNames('vn-button', `vn-button--${variant}`, `vn-button--${size}`, className);
}

export function ButtonLink({
  children,
  className,
  href,
  size,
  variant,
}: ButtonStyleOptions & { children: ReactNode; href: string }) {
  return (
    <Link className={buttonClassName({ className, size, variant })} href={href}>
      {children}
    </Link>
  );
}

export function Button({
  children,
  className,
  size,
  type,
  variant,
  ...props
}: ButtonStyleOptions & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={buttonClassName({ className, size, variant })}
      type={type ?? 'button'}
    >
      {children}
    </button>
  );
}
