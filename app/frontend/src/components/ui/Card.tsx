'use client';

import { ReactNode, HTMLAttributes } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover';
  children: ReactNode;
}

export function Card({ variant = 'default', children, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-neutral-800 border-3 border-neutral-900 dark:border-neutral-100 p-6 animate-fade-in',
        variant === 'default' && 'shadow-brutal',
        variant === 'hover' && 'shadow-brutal transition-all duration-150 hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={clsx('text-xl font-bold text-neutral-900 dark:text-neutral-100', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={clsx('text-neutral-600 mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx(className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('mt-4 pt-4 border-t-2 border-neutral-200', className)} {...props}>
      {children}
    </div>
  );
}
