'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold border-3 border-neutral-900 transition-all duration-150 inline-flex items-center justify-center gap-2';

  const variants = {
    primary: 'bg-primary-500 text-neutral-900 shadow-brutal hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1',
    secondary: 'bg-gold-400 text-neutral-900 shadow-brutal hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1',
    outline: 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-brutal hover:bg-neutral-100 dark:hover:bg-neutral-600 hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1',
    danger: 'bg-red-400 text-white shadow-brutal hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed hover:translate-x-0 hover:translate-y-0',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
}
