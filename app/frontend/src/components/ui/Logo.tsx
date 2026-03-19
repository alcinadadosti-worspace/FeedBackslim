import clsx from 'clsx';

type LogoSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<LogoSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14'
};

export function LogoMark({ size = 'md', className }: { size?: LogoSize; className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      aria-hidden="true"
      className={clsx(sizeMap[size], className)}
    >
      <defs>
        <linearGradient id="pulse360_gold" x1="30" y1="40" x2="220" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f7d889" />
          <stop offset="1" stopColor="#b8842a" />
        </linearGradient>
      </defs>

      <path
        d="M52 148c-18-16-26-33-26-52 0-34 30-56 70-52 28 3 48 18 58 39"
        fill="none"
        stroke="url(#pulse360_gold)"
        strokeWidth="10"
        strokeLinecap="round"
      />

      <path
        d="M98 194L140 54l42 140"
        fill="none"
        stroke="url(#pulse360_gold)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M178 194l28-70 28 70"
        fill="none"
        stroke="url(#pulse360_gold)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M170 162c16-10 36-10 52 0"
        fill="none"
        stroke="url(#pulse360_gold)"
        strokeWidth="10"
        strokeLinecap="round"
      />

      <path
        d="M160 166c-8 6-12 16-12 28v22h80v-22c0-14-6-26-16-34"
        fill="none"
        stroke="url(#pulse360_gold)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M148 190h-10c-6 0-10-4-10-10v-16c0-6 4-10 10-10h10"
        fill="none"
        stroke="url(#pulse360_gold)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M246 190h-14c-6 0-10-4-10-10v-16c0-6 4-10 10-10h14"
        fill="none"
        stroke="url(#pulse360_gold)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M222 150v56"
        fill="none"
        stroke="url(#pulse360_gold)"
        strokeWidth="10"
        strokeLinecap="round"
      />

      <path
        d="M206 150v44"
        fill="none"
        stroke="url(#pulse360_gold)"
        strokeWidth="10"
        strokeLinecap="round"
      />

      <path
        d="M192 188h22c6 0 10 4 10 10v12l-16-12h-16c-6 0-10-4-10-10s4-10 10-10z"
        fill="url(#pulse360_gold)"
        stroke="url(#pulse360_gold)"
        strokeWidth="2"
      />

      <path
        d="M204 194v10"
        fill="none"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="204" cy="210" r="4" fill="#ffffff" />
    </svg>
  );
}

export function Logo({ size = 'md', className }: { size?: LogoSize; className?: string }) {
  return (
    <div
      className={clsx(
        'bg-white border-3 border-neutral-900 shadow-brutal flex items-center justify-center',
        size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12',
        className
      )}
    >
      <LogoMark size={size} />
    </div>
  );
}
