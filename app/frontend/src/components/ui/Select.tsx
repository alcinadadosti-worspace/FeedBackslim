'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2 uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={clsx(
              'w-full px-4 py-3 border-3 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'transition-all appearance-none cursor-pointer pr-10',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1 text-sm font-medium text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
