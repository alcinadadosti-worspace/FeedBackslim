'use client';

import clsx from 'clsx';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Loading({ size = 'md', className }: LoadingProps) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div
        className={clsx(
          'animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500',
          sizes[size]
        )}
      />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <Loading size="lg" />
        <p className="mt-4 font-semibold text-neutral-600">Carregando...</p>
      </div>
    </div>
  );
}
