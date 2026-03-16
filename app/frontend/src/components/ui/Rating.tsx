'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  maxValue?: number;
}

export function Rating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showValue = true,
  maxValue = 10,
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const displayStars = Math.ceil(maxValue / 2); // Mostrar 5 estrelas para nota até 10
  const normalizedValue = value / 2; // Converter nota de 10 para escala de 5 estrelas
  const normalizedHover = hoverValue ? hoverValue / 2 : null;

  const displayValue = normalizedHover !== null ? normalizedHover : normalizedValue;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: displayStars }).map((_, index) => {
          const starValue = (index + 1) * 2;
          const isFilled = displayValue >= index + 1;
          const isHalfFilled = displayValue >= index + 0.5 && displayValue < index + 1;

          return (
            <button
              key={index}
              type="button"
              disabled={readonly}
              onClick={() => onChange?.(starValue)}
              onMouseEnter={() => !readonly && setHoverValue(starValue)}
              onMouseLeave={() => setHoverValue(null)}
              className={clsx(
                'transition-colors',
                !readonly && 'cursor-pointer hover:scale-110'
              )}
            >
              <Star
                className={clsx(
                  sizes[size],
                  isFilled ? 'fill-gold-400 text-gold-400' : isHalfFilled ? 'fill-gold-400/50 text-gold-400' : 'text-neutral-300'
                )}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="font-bold text-neutral-900">
          {(hoverValue !== null ? hoverValue : value).toFixed(0)}/{maxValue}
        </span>
      )}
    </div>
  );
}

interface SimpleRatingProps {
  value: number;
  maxValue?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function SimpleRating({ value, maxValue = 10, size = 'md' }: SimpleRatingProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const displayStars = 5;
  const normalizedValue = value / 2;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: displayStars }).map((_, index) => (
        <Star
          key={index}
          className={clsx(
            sizes[size],
            normalizedValue >= index + 1
              ? 'fill-gold-400 text-gold-400'
              : normalizedValue >= index + 0.5
              ? 'fill-gold-400/50 text-gold-400'
              : 'text-neutral-300'
          )}
        />
      ))}
      <span className="ml-1 font-bold text-neutral-900">{value.toFixed(1)}</span>
    </div>
  );
}
