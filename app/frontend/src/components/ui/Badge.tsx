'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';
import { Award, MessageCircle, Users, Lightbulb, Heart } from 'lucide-react';

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'gold' | 'neutral' | 'danger';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  const variants = {
    primary: 'bg-primary-500 text-neutral-900',
    secondary: 'bg-neutral-900 text-white',
    gold: 'bg-gold-400 text-neutral-900',
    neutral: 'bg-neutral-200 text-neutral-900',
    danger: 'bg-red-400 text-white',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-3 py-1 text-xs font-bold border-2 border-neutral-900',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface BadgeIconProps {
  type: 'LIDER_INSPIRADOR' | 'COMUNICADOR' | 'MENTOR' | 'INOVADOR' | 'COLABORATIVO';
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const badgeConfig = {
  LIDER_INSPIRADOR: {
    icon: Award,
    label: 'Líder Inspirador',
    color: 'bg-gold-400',
  },
  COMUNICADOR: {
    icon: MessageCircle,
    label: 'Comunicador',
    color: 'bg-primary-500',
  },
  MENTOR: {
    icon: Heart,
    label: 'Mentor',
    color: 'bg-red-400',
  },
  INOVADOR: {
    icon: Lightbulb,
    label: 'Inovador',
    color: 'bg-yellow-400',
  },
  COLABORATIVO: {
    icon: Users,
    label: 'Colaborativo',
    color: 'bg-blue-400',
  },
};

export function BadgeIcon({ type, showLabel = true, size = 'md' }: BadgeIconProps) {
  const config = badgeConfig[type];
  const Icon = config.icon;

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-1 border-2 border-neutral-900',
        config.color
      )}
      title={config.label}
    >
      <Icon className={sizes[size]} />
      {showLabel && <span className="text-xs font-bold">{config.label}</span>}
    </div>
  );
}
