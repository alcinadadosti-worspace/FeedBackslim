'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, alt = 'Avatar', size = 'md', className }: AvatarProps) {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  if (!src) {
    return (
      <div
        className={clsx(
          'rounded-full border-3 border-neutral-900 bg-neutral-200 flex items-center justify-center',
          sizes[size],
          className
        )}
      >
        <User className={clsx('text-neutral-500', iconSizes[size])} />
      </div>
    );
  }

  const normalizedSrc = (() => {
    if (src.startsWith('/')) return src;
    if (src.startsWith('http://localhost:') || src.startsWith('http://127.0.0.1:')) {
      try {
        const url = new URL(src);
        return url.pathname + url.search + url.hash;
      } catch {
        return src;
      }
    }
    return src;
  })();

  return (
    <div className={clsx('relative rounded-full border-3 border-neutral-900 overflow-hidden', sizes[size], className)}>
      <Image
        src={normalizedSrc}
        alt={alt}
        fill
        className="object-cover"
      />
    </div>
  );
}
