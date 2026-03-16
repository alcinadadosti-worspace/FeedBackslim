'use client';

import { TextareaHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-bold text-neutral-900 mb-2 uppercase tracking-wide">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={clsx(
            'w-full px-4 py-3 border-3 border-neutral-900 bg-white text-neutral-900',
            'placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500',
            'focus:ring-offset-2 transition-all resize-none',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          rows={4}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm font-medium text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
