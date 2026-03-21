'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2 uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full px-4 py-3 border-3 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100',
            'placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
            'focus:ring-offset-2 transition-all',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm font-medium text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
